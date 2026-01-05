// src/auth/auth.service.ts

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { User, AuthProvider } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSession } from './entities/user-session.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService } from '../mail/mail.service';
import { RolesService } from '../roles/roles.service';
import { RoleName } from '../roles/entities/role.entity';
import { ChangeAdminCredentialsDto } from './dto/change-admin-credentials.dto';
import { DevicesService } from '../devices/devices.service';
import { SetPasswordDto } from './dto/set-password.dto';
import { PrivacyPolicyService } from '../privacy-policy/privacy-policy.service'; // --- [NEW] IMPORT ---

export interface SocialProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private rolesService: RolesService,
    private devicesService: DevicesService,
    private configService: ConfigService,
    private readonly privacyPolicyService: PrivacyPolicyService, // --- [NEW] INJECT ---
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
  ) {
    // Initialize Google OAuth2 Client
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    this.googleClient = new OAuth2Client(clientId);
  }

  /**
   * Logout: Mark a session as inactive by sessionId
   */
  async logout(sessionId: number): Promise<void> {
    const session = await this.userSessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      this.logger.warn(`Logout failed: Invalid sessionId=${sessionId}`);
      throw new BadRequestException('Invalid session ID');
    }
    session.active = false;
    await this.userSessionRepository.save(session);
    this.logger.log(`Session logged out: sessionId=${sessionId}, userId=${session.user?.id}`);
  }

  /**
   * Admin: Force logout all sessions for a user (deactivate all active sessions)
   */
  async forceLogoutAllSessions(userId: number): Promise<void> {
    const result = await this.userSessionRepository.update(
      { user: { id: userId }, active: true },
      { active: false },
    );
    this.logger.log(`Admin forced logout for userId=${userId}. Updated ${result.affected} sessions.`);
  }

  async loginWithGoogleMobile(token: string): Promise<any> {
    this.logger.log('Starting Google Mobile Login flow...');

    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';

      this.logger.debug('Verifying ID Token with Google...');
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        this.logger.error('Google Token payload was empty.');
        throw new BadRequestException('Invalid Google Token payload');
      }

      this.logger.debug(
        `Token verified. Email: ${payload.email}, Verified: ${payload.email_verified}`,
      );

      if (!payload.email_verified) {
        this.logger.warn(
          `Login blocked: Email ${payload.email} is not verified by Google.`,
        );
        throw new BadRequestException(
          'Google email is not verified. Please verify your email with Google first.',
        );
      }

      const socialProfile: SocialProfile = {
        provider: 'google',
        providerId: payload.sub,
        email: payload.email || '',
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
      };

      this.logger.log('Validating/Creating user from Social Profile...');
      const user = await this.validateSocialLogin(socialProfile);
      this.logger.log(`User processed successfully. ID: ${user.id}`);

      this.logger.debug(`Checking device limits for User ID: ${user.id}`);
      await this.checkDeviceLimit(user.id);

      this.logger.log('Generating JWT token...');
      // --- [MODIFIED] Return the result of the login method ---
      return this.login(user);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Mobile Google Login Failed', error.stack);
      throw new UnauthorizedException('Invalid or expired Google Token');
    }
  }

  async validateSocialLogin(profile: SocialProfile): Promise<User> {
    this.logger.debug(
      `Searching for user by Provider ID: ${profile.providerId} (${profile.provider})`,
    );
    let user = await this.usersService.findByProviderId(
      profile.provider,
      profile.providerId,
    );
    if (user) {
      this.logger.log('User found by Provider ID.');
      return user;
    }

    if (!profile.email) {
      throw new BadRequestException(
        'Email not provided by the social provider.',
      );
    }

    const lowercasedEmail = profile.email.toLowerCase();
    this.logger.debug(
      `User not found by Provider ID. Searching by email: ${lowercasedEmail}`,
    );

    const existingUser = await this.usersService.findByEmail(lowercasedEmail);
    if (existingUser) {
      this.logger.log('User found by Email. Linking account...');
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

    this.logger.log('No existing user found. Creating new user...');
    const defaultRole = await this.rolesService.findByName(RoleName.USER);
    if (!defaultRole) {
      this.logger.error('Default user role (USER) not found in DB.');
      throw new InternalServerErrorException('Default user role not found.');
    }

    const newUser = {
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

  async guestToken() {
    let guestUser = await this.usersService.findByEmail('guest@guest.local');

    const guestRole = await this.rolesService.findByName(RoleName.GUEST);
    if (!guestRole) {
      this.logger.error('Guest role not found.');
      throw new InternalServerErrorException('Guest role not found.');
    }

    if (!guestUser) {
      guestUser = await this.usersService.create({
        email: 'guest@guest.local',
        firstName: 'Guest',
        lastName: 'User',
        role: guestRole,
        agreedToTerms: false,
        authProvider: AuthProvider.LOCAL,
        password: null,
      });
      this.logger.log('Created new guest user.');
    } else if (guestUser.role?.name !== RoleName.GUEST) {
      guestUser = await this.usersService.update(guestUser.id, { role: guestRole });
      this.logger.log('Updated guest user to GUEST role.');
    }

    this.logger.log(`Guest token requested. userId=${guestUser.id}`);
    return this.login(guestUser);
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
    const user = await this.usersService.findByLoginIdentifier(loginIdentifier);

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, otp, otpExpiresAt, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Limit concurrent logins to 3 per user.
   */
  async login(user: User) {
    // Only apply session limit to USER role
    if (user.role?.name === RoleName.USER) {
      const activeSessions = await this.userSessionRepository.count({
        where: { user: { id: user.id }, active: true },
      });
      this.logger.log(`User ${user.id} (${user.email}) has ${activeSessions} active sessions.`);
      if (activeSessions >= 3) {
        this.logger.warn(`User ${user.id} (${user.email}) exceeded session limit.`);
        throw new ForbiddenException(
          'You are the 4th user to login with this credential. The limit of 3 concurrent logins has been reached.',
        );
      }
    }

    // --- [NEW] PRIVACY POLICY CHECK ---
    const mandatoryPolicy = await this.privacyPolicyService.getCurrentMandatoryPolicy();
    let requiresAcceptance = false;
    if (mandatoryPolicy && user.role?.name !== RoleName.ADMIN) { // Admins bypass the check
      requiresAcceptance = !(await this.privacyPolicyService.hasUserAcceptedPolicy(
        user.id,
        mandatoryPolicy.id,
      ));
    }
    // --- [END OF NEW] ---

    const session = this.userSessionRepository.create({
      user,
      active: true,
    });
    await this.userSessionRepository.save(session);
    this.logger.log(`Session created: userId=${user.id}, sessionId=${session.id}`);

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
    };

    // --- [MODIFIED] DYNAMIC LOGIN RESPONSE ---
    return {
      access_token: this.jwtService.sign(payload),
      message: 'Login successful',
      sessionId: session.id,
      policyAcceptance: {
        isRequired: requiresAcceptance,
        // If required, send policy details to the client
        policy: requiresAcceptance ? mandatoryPolicy : undefined,
      },
    };
  }

  async checkDeviceLimit(userId: number): Promise<void> {
    const deviceCount = await this.devicesService.countByUserId(userId);
    if (deviceCount >= 3) {
      throw new ForbiddenException(
        'Device limit reached. Please log out from another device.',
      );
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
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

  async setPassword(userId: number, setDto: SetPasswordDto): Promise<void> {
    const { newPassword } = setDto;
    const user = await this.usersService.findById(userId);

    if (user && user.password) {
      throw new BadRequestException(
        'User already has a password set. Please use the change-password endpoint.',
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, { password: hashedNewPassword });
  }

  async changeAdminCredentials(
    adminId: number,
    changeDto: ChangeAdminCredentialsDto,
  ): Promise<User> {
    const { email, newPassword, confirmPassword } = changeDto;
    const dataToUpdate: Partial<User> = {};

    if (!email && !newPassword) {
      throw new BadRequestException(
        'At least one field (email or newPassword) must be provided.',
      );
    }

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }
      dataToUpdate.password = await bcrypt.hash(newPassword, 10);
    }

    if (email) {
      const lowercasedEmail = email.toLowerCase();
      const existingUser = await this.usersService.findByEmail(lowercasedEmail);
      if (existingUser && existingUser.id !== adminId) {
        throw new ConflictException('Email already in use by another account');
      }
      dataToUpdate.email = lowercasedEmail;
    }

    return this.usersService.update(adminId, dataToUpdate);
  }
}