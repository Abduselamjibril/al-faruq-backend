// src/auth/auth.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { User, AuthProvider } from '../users/entities/user.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService } from '../mail/mail.service';
import { RolesService } from '../roles/roles.service';
import { RoleName } from '../roles/entities/role.entity';

export interface SocialProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private rolesService: RolesService,
  ) {}

  async validateSocialLogin(profile: SocialProfile): Promise<User> {
    let user = await this.usersService.findByProviderId(
      profile.provider,
      profile.providerId,
    );
    if (user) {
      return user;
    }

    if (!profile.email) {
      throw new BadRequestException('Email not provided by the social provider.');
    }

    // --- FIX: Normalize email from social provider to lowercase ---
    const lowercasedEmail = profile.email.toLowerCase();

    const existingUser = await this.usersService.findByEmail(lowercasedEmail);
    if (existingUser) {
      const updateData: Partial<User> = {};
      if (profile.provider === 'google') {
        updateData.googleId = profile.providerId;
        updateData.authProvider = AuthProvider.GOOGLE;
      } else if (profile.provider === 'facebook') {
        updateData.facebookId = profile.providerId;
        updateData.authProvider = AuthProvider.FACEBOOK;
      }
      return this.usersService.update(existingUser.id, updateData);
    }

    const defaultRole = await this.rolesService.findByName(RoleName.USER);
    if (!defaultRole) {
      throw new InternalServerErrorException('Default user role not found.');
    }

    const newUser = {
      // --- FIX: Store the normalized email ---
      email: lowercasedEmail,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: defaultRole,
      agreedToTerms: true,
      authProvider:
        profile.provider === 'google'
          ? AuthProvider.GOOGLE
          : AuthProvider.FACEBOOK,
      googleId: profile.provider === 'google' ? profile.providerId : null,
      facebookId: profile.provider === 'facebook' ? profile.providerId : null,
      phoneNumber: null,
    };

    return this.usersService.create(newUser);
  }

  async register(registerDto: RegisterUserDto): Promise<User> {
    const { password, confirmPassword, phoneNumber, email, ...rest } =
      registerDto;
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (phoneNumber) {
      const existingPhone =
        await this.usersService.findByPhoneNumber(phoneNumber);
      if (existingPhone) {
        throw new ConflictException('Phone number already in use');
      }
    }

    // --- FIX: Normalize email to lowercase before checking and saving ---
    const lowercasedEmail = email.toLowerCase();

    const existingEmail = await this.usersService.findByEmail(lowercasedEmail);
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const defaultRole = await this.rolesService.findByName(RoleName.USER);
    if (!defaultRole) {
      throw new InternalServerErrorException('Default user role not found.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.usersService.create({
        ...rest,
        phoneNumber,
        // --- FIX: Store the normalized email ---
        email: lowercasedEmail,
        password: hashedPassword,
        authProvider: AuthProvider.LOCAL,
        role: defaultRole,
      });
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Could not create user');
    }
  }

  async validateUser(loginIdentifier: string, pass: string): Promise<any> {
    // No change is needed here because findByLoginIdentifier in UsersService now handles normalization.
    const user =
      await this.usersService.findByLoginIdentifier(loginIdentifier);

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, otp, otpExpiresAt, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    // --- FIX: Normalize email to lowercase before searching ---
    const lowercasedEmail = email.toLowerCase();
    const user = await this.usersService.findByEmail(lowercasedEmail);

    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const hashedOtp = await bcrypt.hash(otp, 10);
    await this.usersService.update(user.id, { otp: hashedOtp, otpExpiresAt });
    await this.mailService.sendPasswordResetOTP(user, otp);
    console.log(`OTP for ${user.email}: ${otp}`);
  }

  async resetPassword(resetDto: ResetPasswordDto): Promise<void> {
    const { email, otp, newPassword } = resetDto;

    // --- FIX: Normalize email to lowercase before searching ---
    const lowercasedEmail = email.toLowerCase();
    const user = await this.usersService.findByEmail(lowercasedEmail);

    if (
      !user ||
      !user.otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(user.id, {
      password: hashedPassword,
      otp: undefined,
      otpExpiresAt: undefined,
    });
  }

  async changePassword(
    userId: number,
    changeDto: ChangePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword } = changeDto;
    const user = await this.usersService.findById(userId);

    if (!user || !user.password) {
      throw new BadRequestException(
        'User not found or does not have a local password set.',
      );
    }

    const isPasswordMatching = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Incorrect current password');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, { password: hashedNewPassword });
  }
}