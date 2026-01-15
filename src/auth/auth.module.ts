import { Module, forwardRef } from '@nestjs/common';
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
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSession } from './entities/user-session.entity';
import { DevicesModule } from '../devices/devices.module';
import { PrivacyPolicyModule } from '../privacy-policy/privacy-policy.module';
import { TermsOfServiceModule } from '../terms-of-service/terms-of-service.module'; // --- [NEW] ---

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    MailModule,
    RolesModule,
    DevicesModule,
    PrivacyPolicyModule,
    TypeOrmModule.forFeature([UserSession]),
    // --- [NEW] Use forwardRef to handle circular dependencies ---
    forwardRef(() => TermsOfServiceModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const jwtExpiresInRaw = configService.get<string>('JWT_EXPIRES_IN');
        if (!jwtSecret || !jwtExpiresInRaw) {
          throw new Error(
            'JWT configuration (JWT_SECRET or JWT_EXPIRES_IN) is missing in .env file.',
          );
        }
        const expiresIn = /^\d+$/.test(jwtExpiresInRaw)
          ? parseInt(jwtExpiresInRaw, 10)
          : jwtExpiresInRaw;
        return {
          secret: jwtSecret,
          signOptions: {
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