// src/main.ts

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set a global prefix for all routes, e.g., /api
  app.setGlobalPrefix('api');

  // --- THIS IS THE FIX ---
  // We use a regular expression for the origin.
  // This allows 'http://localhost:5173' AND your Flutter app on any port
  // (e.g., 'http://localhost:54321') to make requests.
  app.enableCors({
    origin: /localhost:\d+$/, // Matches localhost on any port
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Enable global validation for all incoming DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // The redundant app.enableCors() call has been removed.

  await app.listen(3000);
}
bootstrap();