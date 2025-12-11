import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { MailModule } from '../mail/mail.module';
import { RolesModule } from '../roles/roles.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    MailModule,
    RolesModule,
    DevicesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const jwtExpiresInRaw = configService.get<string>('JWT_EXPIRES_IN');

        if (!jwtSecret || !jwtExpiresInRaw) {
          throw new Error('JWT configuration (JWT_SECRET or JWT_EXPIRES_IN) is missing in .env file.');
        }

        // Logic: Check if the value is purely numeric (e.g. "3600").
        // If yes, parse to number (seconds).
        // If no (e.g. "100y", "1d"), keep as string (library handles units).
        const expiresIn = /^\d+$/.test(jwtExpiresInRaw)
          ? parseInt(jwtExpiresInRaw, 10)
          : jwtExpiresInRaw;

        return {
          secret: jwtSecret,
          signOptions: {
            // UPDATED: Cast to 'any' to fix the TypeScript mismatch 
            // between generic 'string' and the library's 'StringValue' type.
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}