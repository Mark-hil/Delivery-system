import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI to render smoothly
    })
  );

  // Cross-Origin Resource Sharing
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

  // OpenAPI / Swagger Documentation
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

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 SwiftSend Backend running at http://localhost:${port}/api`);
  console.log(`📚 Interactive Swagger API Docs: http://localhost:${port}/api/docs`);
}

await bootstrap();
