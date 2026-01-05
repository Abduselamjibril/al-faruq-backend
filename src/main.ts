// src/main.ts

import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './database/seed.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import dataSource from './data-source';
import { ConfigService } from '@nestjs/config';
import { PolicyAcceptanceGuard } from './privacy-policy/guards/policy-acceptance.guard'; // --- [NEW] IMPORT GUARD ---
import { PrivacyPolicyService } from './privacy-policy/privacy-policy.service'; // --- [NEW] IMPORT SERVICE ---

async function bootstrap() {
  // --- RUN DATABASE MIGRATIONS ON STARTUP ---
  try {
    console.log('Initializing database connection for migrations...');
    const db = await dataSource.initialize();
    console.log('Database connection initialized. Running migrations...');
    await db.runMigrations();
    console.log('Migrations have been run successfully.');
    await db.destroy();
    console.log('Temporary database connection for migrations closed.');
  } catch (error)
  {
    console.error('FATAL: Error running database migrations.', error);
    process.exit(1);
  }
  // --- END OF MIGRATIONS BLOCK ---

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  app.setGlobalPrefix('api');

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin === '*' ? true : corsOrigin.split(','),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    console.log(`CORS enabled for origin(s): ${corsOrigin}`);
  } else {
    app.enableCors({
      origin: /localhost:\d+$/,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    console.log('CORS enabled for origin: localhost');
  }

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

  // --- [NEW] GLOBAL GUARD FOR POLICY ACCEPTANCE ---
  const reflector = app.get(Reflector);
  const policyService = app.get(PrivacyPolicyService);
  app.useGlobalGuards(new PolicyAcceptanceGuard(reflector, policyService));
  // --- [END OF NEW] ---

  // --- SWAGGER (OPENAPI) SETUP ---
  const config = new DocumentBuilder()
    .setTitle('Alfaruq API')
    .setDescription(
      'The official API documentation for the Alfaruq application.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  // --- END OF SWAGGER SETUP ---

  // The seeder is temporarily disabled to prevent the application from crashing on startup.
  // const seeder = app.get(SeedService);
  // await seeder.seedDatabase();

  await app.listen(5000);
  console.log(`Application is now running on: ${await app.getUrl()}`);
}
bootstrap();