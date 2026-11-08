import * as dns from "dns";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

// Prefer IPv4 DNS records first to prevent Node.js fetch (undici) from timing out
// on dual-stack Cloudflare endpoints (such as Arkesel SMS and OSRM) when IPv6 is unreachable.
dns.setDefaultResultOrder("ipv4first");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const isProd = process.env.NODE_ENV === "production";

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false, // Allows Swagger UI to render smoothly in non-prod
    })
  );

  // Cross-Origin Resource Sharing
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  });

  // Global API Route Prefix
  app.setGlobalPrefix("api");

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // OpenAPI / Swagger Documentation (non-production only)
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("SwiftSend Enterprise API")
      .setDescription("Enterprise Backend API for SwiftSend Customer, Rider, and Admin Portals")
      .setVersion("1.0.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "JWT",
          description: "Enter your JWT token",
          in: "header",
        },
        "access-token"
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document, {
      customSiteTitle: "SwiftSend API Documentation",
    });
  }

  const port = Number(process.env.PORT);
  const backendUrl = process.env.BACKEND_URL;
  await app.listen(port);
  console.log(`🚀 SwiftSend Backend running at ${backendUrl}/api`);
  console.log(`📚 Interactive Swagger API Docs: ${backendUrl}/api/docs`);
}

await bootstrap();
