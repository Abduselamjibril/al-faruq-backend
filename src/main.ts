// src/main.ts

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './database/seed.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // <-- 1. IMPORT SWAGGER MODULES

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set a global prefix for all routes, e.g., /api
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: /localhost:\d+$/, // Matches localhost on any port
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // --- 2. SWAGGER (OPENAPI) SETUP ---
  const config = new DocumentBuilder()
    .setTitle('Alfaruq API')
    .setDescription('The official API documentation for the Alfaruq application.')
    .setVersion('1.0')
    .addBearerAuth() // This is important for routes that require a JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // Your docs will be at http://localhost:3000/api-docs
  // --- END OF SWAGGER SETUP ---

  const seeder = app.get(SeedService);
  await seeder.seedDatabase();

  await app.listen(5000);
}
bootstrap();