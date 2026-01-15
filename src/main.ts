
import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './database/seed.service';
import { QuranSeederService } from './quran/quran-seeder.service';
import { PolicyAcceptanceGuard } from './privacy-policy/guards/policy-acceptance.guard';
import { PrivacyPolicyService } from './privacy-policy/privacy-policy.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  app.setGlobalPrefix('api');

  // CORS Configuration
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin === '*' ? true : corsOrigin.split(','),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    console.log(`CORS enabled for origin(s): ${corsOrigin}`);
  } else {
    // Default CORS for local dev
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

  // --- GLOBAL GUARDS SETUP ---
  const reflector = app.get(Reflector);

  // 1. Privacy Policy Guard
  const policyService = app.get(PrivacyPolicyService);

  app.useGlobalGuards(
    new PolicyAcceptanceGuard(reflector, policyService),
    
  );
 

  // Swagger (OpenAPI) Setup
  const config = new DocumentBuilder()
    .setTitle('Alfaruq API')
    .setDescription('The official API documentation for the Alfaruq application.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Database Seeding
  const seeder = app.get(SeedService);
  const quranSeeder = app.get(QuranSeederService);
  await seeder.seedDatabase();
  await quranSeeder.seedQuranStructure();

  await app.listen(5000);
  console.log(`Application is now running on: ${await app.getUrl()}`);
}
bootstrap();