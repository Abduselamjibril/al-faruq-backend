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
        // --- THIS IS THE FINAL FIX ---
        // Read the value as a number from the .env file (e.g., 86400)
        const jwtExpiresIn = configService.get<number>('JWT_EXPIRES_IN');

        if (!jwtSecret || jwtExpiresIn === undefined) {
          throw new Error('JWT configuration (JWT_SECRET or JWT_EXPIRES_IN) is missing or invalid in .env file.');
        }

        return {
          secret: jwtSecret,
          signOptions: {
            // This will now be a number, which satisfies the library's type requirement.
            expiresIn: jwtExpiresIn,
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