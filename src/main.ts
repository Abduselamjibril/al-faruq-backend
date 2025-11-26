// src/main.ts

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './database/seed.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import dataSource from './data-source'; // <-- 1. IMPORT THE DATASOURCE
import { ConfigService } from '@nestjs/config'; // --- [CHANGE 1] --- Import ConfigService

async function bootstrap() {
  // --- 2. RUN DATABASE MIGRATIONS ON STARTUP ---
  // This block ensures the database schema is up-to-date before the application runs.
  try {
    console.log('Initializing database connection for migrations...');
    const db = await dataSource.initialize();
    console.log('Database connection initialized. Running migrations...');
    await db.runMigrations();
    console.log('Migrations have been run successfully.');
    await db.destroy();
    console.log('Temporary database connection for migrations closed.');
  } catch (error) {
    console.error('FATAL: Error running database migrations.', error);
    process.exit(1); // Exit the process with an error code if migrations fail
  }
  // --- END OF MIGRATIONS BLOCK ---

  const app = await NestFactory.create(AppModule);

  // --- [CHANGE 2 START] ---
  // Get the ConfigService instance from the app container
  const configService = app.get(ConfigService);

  // Set a global prefix for all routes, e.g., /api
  app.setGlobalPrefix('api');

  // Get the CORS origin from the .env file.
  // If it's not set, it will default to allowing localhost for development.
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  
  if (corsOrigin) {
    // If CORS_ORIGIN is set in the .env file
    app.enableCors({
      // The value will be '*' for production, allowing all origins.
      origin: corsOrigin === '*' ? true : corsOrigin.split(','),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    console.log(`CORS enabled for origin(s): ${corsOrigin}`);
  } else {
    // Default behavior if CORS_ORIGIN is not set (for local development)
    app.enableCors({
      origin: /localhost:\d+$/, // Matches localhost on any port
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    console.log('CORS enabled for origin: localhost');
  }
  // --- [CHANGE 2 END] ---


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

  // --- SWAGGER (OPENAPI) SETUP ---
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
  console.log(`Application is now running on: ${await app.getUrl()}`);
}
bootstrap();