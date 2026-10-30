import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUserPayload {
  userId: string;
  email: string;
  role: "customer" | "rider" | "admin";
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
