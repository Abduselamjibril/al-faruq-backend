import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger, // 🟢 IMPORT LOGGER
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { User, AuthProvider } from '../users/entities/user.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService } from '../mail/mail.service';
import { RolesService } from '../roles/roles.service';
import { RoleName } from '../roles/entities/role.entity';
import { ChangeAdminCredentialsDto } from './dto/change-admin-credentials.dto';
import { DevicesService } from '../devices/devices.service';

export interface SocialProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class AuthService {
  // 🟢 INITIALIZE LOGGER
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private rolesService: RolesService,
    private devicesService: DevicesService,
    private configService: ConfigService,
  ) {
    // Initialize Google OAuth2 Client
    // We use || '' to handle potential undefined values from config
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    this.googleClient = new OAuth2Client(clientId);
  }

  // --- NEW METHOD FOR MOBILE GOOGLE LOGIN ---
  async loginWithGoogleMobile(token: string): Promise<any> {
    this.logger.log('Starting Google Mobile Login flow...'); // 🟢 LOG

    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';

      // 1. Verify the ID Token with Google
      this.logger.debug('Verifying ID Token with Google...'); // 🟢 LOG
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        this.logger.error('Google Token payload was empty.'); // 🟢 LOG
        throw new BadRequestException('Invalid Google Token payload');
      }

      this.logger.debug(`Token verified. Email: ${payload.email}, Verified: ${payload.email_verified}`); // 🟢 LOG

      // --- SECURITY UPDATE: Check if email is verified ---
      if (!payload.email_verified) {
        this.logger.warn(`Login blocked: Email ${payload.email} is not verified by Google.`); // 🟢 LOG
        throw new BadRequestException(
          'Google email is not verified. Please verify your email with Google first.',
        );
      }
      // --------------------------------------------------

      // 2. Construct the SocialProfile object
      // We use || '' to ensure we pass a string, even if Google returns undefined
      const socialProfile: SocialProfile = {
        provider: 'google',
        providerId: payload.sub,
        email: payload.email || '', 
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
      };

      // 3. Find or Create the user (Reuse existing logic)
      this.logger.log('Validating/Creating user from Social Profile...'); // 🟢 LOG
      const user = await this.validateSocialLogin(socialProfile);
      this.logger.log(`User processed successfully. ID: ${user.id}`); // 🟢 LOG

      // 4. Check device limits (Reuse existing logic)
      this.logger.debug(`Checking device limits for User ID: ${user.id}`); // 🟢 LOG
      await this.checkDeviceLimit(user.id);

      // 5. Generate JWT Token
      this.logger.log('Generating JWT token...'); // 🟢 LOG
      return this.login(user);
    } catch (error) {
      // If we threw a BadRequestException explicitly (like email not verified), rethrow it.
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Mobile Google Login Failed', error.stack); // 🟢 LOG
      throw new UnauthorizedException('Invalid or expired Google Token');
    }
  }

  async validateSocialLogin(profile: SocialProfile): Promise<User> {
    this.logger.debug(`Searching for user by Provider ID: ${profile.providerId} (${profile.provider})`); // 🟢 LOG
    let user = await this.usersService.findByProviderId(
      profile.provider,
      profile.providerId,
    );
    if (user) {
      this.logger.log('User found by Provider ID.'); // 🟢 LOG
      return user;
    }

    if (!profile.email) {
      throw new BadRequestException('Email not provided by the social provider.');
    }

    const lowercasedEmail = profile.email.toLowerCase();
    this.logger.debug(`User not found by Provider ID. Searching by email: ${lowercasedEmail}`); // 🟢 LOG

    const existingUser = await this.usersService.findByEmail(lowercasedEmail);
    if (existingUser) {
      this.logger.log('User found by Email. Linking account...'); // 🟢 LOG
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

    this.logger.log('No existing user found. Creating new user...'); // 🟢 LOG
    const defaultRole = await this.rolesService.findByName(RoleName.USER);
    if (!defaultRole) {
      this.logger.error('Default user role (USER) not found in DB.'); // 🟢 LOG
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
      // UPDATED: No second argument. Uses the global expiration from AuthModule.
      access_token: this.jwtService.sign(payload),
    };
  }

  async checkDeviceLimit(userId: number): Promise<void> {
    const deviceCount = await this.devicesService.countByUserId(userId);
    // We check for 3 or more. You can change this number easily.
    if (deviceCount >= 3) {
      throw new ForbiddenException('Device limit reached. Please log out from another device.');
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

  async changeAdminCredentials(
    adminId: number,
    changeDto: ChangeAdminCredentialsDto,
  ): Promise<User> {
    const { email, newPassword, confirmPassword } = changeDto;
    const dataToUpdate: Partial<User> = {};

    if (!email && !newPassword) {
      throw new BadRequestException('At least one field (email or newPassword) must be provided.');
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