import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../../database/redis.service.js";
import { PrismaService } from "../../database/prisma.service.js";

export interface RiderCoordsDto {
  lat: number;
  lng: number;
  heading?: number;
  deliveryId?: string;
}

export interface JoinDeliveryDto {
  deliveryId: string;
}

@WebSocketGateway({
  namespace: "/dispatch",
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class DispatchGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  public server: Server;

  private readonly logger = new Logger(DispatchGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService
  ) {}

  afterInit(server: Server) {
    this.logger.log("📡 Dispatch WebSocket Gateway initialized on /dispatch namespace");
  }

  async handleConnection(client: Socket) {
    try {
      // 1. Extract Bearer token from handshake auth or headers
      const authHeader =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization;

      if (!authHeader) {
        this.logger.warn(`Unauthorized socket connection attempt: ${client.id}`);
        client.disconnect(true);
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, "");
      const secret = this.config.getOrThrow<string>("JWT_ACCESS_SECRET");

      const payload = await this.jwt.verifyAsync(token, { secret });

      // Verify user exists and is not suspended
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!dbUser || dbUser.status === "Suspended") {
        this.logger.warn(`Suspended or deleted user attempted socket connection: ${client.id}`);
        client.disconnect(true);
        return;
      }

      client.data.user = payload;

      this.logger.log(
        `Socket client connected: ${client.id} (User: ${payload.email}, Role: ${payload.role})`
      );

      // 2. Auto-join role-specific rooms
      if (payload.role === "rider") {
        const rider = await this.prisma.riderProfile.findUnique({
          where: { userId: payload.sub },
        });
        if (rider && rider.approvalStatus === "Approved") {
          client.data.riderId = rider.id;
          client.join(`rider:${rider.id}`);
          this.logger.log(`Rider joined room: rider:${rider.id}`);
        }
      } else if (payload.role === "admin") {
        client.join("admin:monitoring");
        this.logger.log(`Admin joined room: admin:monitoring`);
      }
    } catch (err: any) {
      this.logger.warn(`Socket auth error on client ${client.id}: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket client disconnected: ${client.id}`);
  }

  // ---------------------------------------------------------
  // CLIENT LISTENERS
  // ---------------------------------------------------------

  @SubscribeMessage("join:delivery")
  async handleJoinDelivery(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinDeliveryDto
  ) {
    if (!data?.deliveryId) return { success: false, error: "Missing deliveryId" };

    const user = client.data?.user;
    if (!user) {
      return { success: false, error: "Unauthenticated socket" };
    }

    // Security: Only the owner customer, assigned rider, or an admin may join this room
    if (user.role !== "admin") {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: data.deliveryId },
        include: {
          customer: true,
          rider: true,
        },
      });

      if (!delivery) {
        return { success: false, error: "Delivery not found" };
      }

      const isOwnerCustomer =
        user.role === "customer" && delivery.customer.userId === user.sub;
      const isAssignedRider =
        user.role === "rider" && delivery.rider?.userId === user.sub;

      if (!isOwnerCustomer && !isAssignedRider) {
        this.logger.warn(
          `Unauthorized attempt by ${user.email} (${user.role}) to join delivery room ${data.deliveryId}`
        );
        return {
          success: false,
          error: "Unauthorized to join this delivery tracking room",
        };
      }
    }

    const room = `delivery:${data.deliveryId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined tracking room: ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage("leave:delivery")
  handleLeaveDelivery(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinDeliveryDto
  ) {
    if (!data?.deliveryId) return { success: false, error: "Missing deliveryId" };
    const room = `delivery:${data.deliveryId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left tracking room: ${room}`);
    return { success: true };
  }

  @SubscribeMessage("rider:update_coords")
  async handleRiderUpdateCoords(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RiderCoordsDto
  ) {
    const riderId = client.data?.riderId;
    if (!riderId) {
      return {
        success: false,
        error: "Only authenticated riders can stream coordinates",
      };
    }

    if (
      data.lat == null ||
      data.lng == null ||
      typeof data.lat !== "number" ||
      typeof data.lng !== "number" ||
      data.lat < -90 ||
      data.lat > 90 ||
      data.lng < -180 ||
      data.lng > 180
    ) {
      return {
        success: false,
        error: "Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180",
      };
    }

    // 1. Update Redis geospatial index
    await this.redis.updateRiderLocation(riderId, data.lat, data.lng);

    const locationEvent = {
      riderId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading ?? 0,
      timestamp: Date.now(),
    };

    // 2. Broadcast to specific delivery tracking room ONLY if this rider is assigned to that delivery
    if (data.deliveryId) {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: data.deliveryId },
        select: { riderId: true },
      });
      if (delivery && delivery.riderId === riderId) {
        this.server
          .to(`delivery:${data.deliveryId}`)
          .emit("rider:location_changed", locationEvent);
      } else {
        this.logger.warn(
          `Rider ${riderId} attempted to stream coords into unassigned delivery ${data.deliveryId}`
        );
      }
    }

    // 3. Broadcast to Admin real-time monitoring map
    this.server
      .to("admin:monitoring")
      .emit("rider:location_changed", locationEvent);

    return { success: true };
  }

  // ---------------------------------------------------------
  // PUBLIC DISPATCH BROADCAST METHODS (CALLED BY SERVICES)
  // ---------------------------------------------------------

  broadcastNewJob(delivery: any, nearbyRiderIds: string[]) {
    this.logger.log(
      `Broadcasting new job ${delivery.id} to ${nearbyRiderIds.length} nearby riders`
    );

    for (const riderId of nearbyRiderIds) {
      this.server.to(`rider:${riderId}`).emit("delivery:new_job", delivery);
    }

    // Also notify admin monitoring
    this.server.to("admin:monitoring").emit("delivery:created", delivery);
  }

  broadcastStatusChange(deliveryId: string, status: string, details?: any) {
    const payload = {
      deliveryId,
      status,
      details,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(
      `Broadcasting status change for delivery ${deliveryId}: ${status}`
    );

    // Broadcast to customer & rider in the delivery room
    this.server
      .to(`delivery:${deliveryId}`)
      .emit("delivery:status_changed", payload);

    // Broadcast to Admin live monitoring
    this.server
      .to("admin:monitoring")
      .emit("delivery:status_changed", payload);
  }

  broadcastDeliveryCompleted(deliveryId: string, details?: any) {
    const payload = {
      deliveryId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`Broadcasting completion for delivery ${deliveryId}`);

    this.server
      .to(`delivery:${deliveryId}`)
      .emit("delivery:completed", payload);
    this.server.to("admin:monitoring").emit("delivery:completed", payload);
  }
}
