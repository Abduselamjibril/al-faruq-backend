// src/auth/auth.controller.ts

import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  Get,
  Patch,
  UseInterceptors,
  ClassSerializerInterceptor,
  Res,
  HttpCode,
  HttpStatus,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from '../users/users.service';
import { Roles } from './decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import { RolesGuard } from './guards/roles.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiBody,
} from '@nestjs/swagger';
import { LoginUserDto } from './dto/login-user.dto';
import { ChangeAdminCredentialsDto } from './dto/change-admin-credentials.dto';
import { GoogleMobileLoginDto } from './dto/google-mobile-login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ForceLogoutDto } from './dto/force-logout.dto';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permissions } from './decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';
import { SkipTosCheck } from '../terms-of-service/decorators/skip-tos-check.decorator'; // --- [NEW] ---
import { TermsOfServiceGuard } from 'src/terms-of-service/guards/terms-of-service.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @SkipTosCheck() // --- [NEW] ---
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 409, description: 'Email or phone number already in use.' })
  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    return this.authService.register(registerDto);
  }

  @SkipTosCheck() // --- [NEW] ---
  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized, invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Device limit reached.' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() _loginDto: LoginUserDto) {
    await this.authService.checkDeviceLimit(req.user.id);
    return this.authService.login(req.user);
  }

  @SkipTosCheck() // --- [NEW] ---
  @ApiOperation({ summary: 'Logout and deactivate a session' })
  @ApiResponse({ status: 200, description: 'Session logged out successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid session ID.' })
  @ApiBody({ schema: { type: 'object', properties: { sessionId: { type: 'integer', example: 1 } }, required: ['sessionId'] } })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body() body: { sessionId: number }) {
    if (!body.sessionId) {
      throw new BadRequestException('Session ID is required.');
    }
    await this.authService.logout(body.sessionId);
    return { message: 'Logged out successfully.' };
  }

  @SkipTosCheck() // --- [NEW] ---
  @ApiOperation({ summary: 'Login with Google ID Token (Mobile)' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT.' })
  @ApiResponse({ status: 401, description: 'Invalid Token.' })
  @Post('google-mobile')
  async googleMobileLogin(@Body() loginDto: GoogleMobileLoginDto) {
    return this.authService.loginWithGoogleMobile(loginDto.token);
  }

  @SkipTosCheck() // --- [NEW] ---
  @ApiOperation({ summary: 'Request a password reset OTP' })
  @ApiResponse({ status: 200, description: 'A confirmation message is always returned.' })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(forgotPasswordDto.email);
    return { message: 'If an account with that email exists, a password reset OTP has been sent.' };
  }

  @SkipTosCheck() // --- [NEW] ---
  @ApiOperation({ summary: 'Reset password using an OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password has been reset successfully.' };
  }

  @SkipTosCheck() // --- [NEW] ---
  @ApiOperation({ summary: 'Initiate Google SSO flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Google for authentication.' })
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @SkipTosCheck() // --- [NEW] ---
  @ApiExcludeEndpoint()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const { access_token } = await this.authService.login(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
  }

  @SkipTosCheck() // --- [NEW] ---
  @ApiOperation({ summary: 'Initiate Facebook SSO flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Facebook for authentication.' })
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookAuth() {}

  @SkipTosCheck() // --- [NEW] ---
  @ApiExcludeEndpoint()
  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookAuthRedirect(@Request() req, @Res() res: Response) {
    const { access_token } = await this.authService.login(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
  }

  @ApiOperation({ summary: 'Change password for the logged-in user (User Only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized or incorrect current password.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @Patch('change-password')
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    await this.authService.changePassword(req.user.id, changePasswordDto);
    return { message: 'Password changed successfully.' };
  }

  @ApiOperation({ summary: 'Set password for SSO users who have no password (User Only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Password set successfully.' })
  @ApiResponse({ status: 400, description: 'User already has a password set (must use change-password).' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @Patch('set-password')
  async setPassword(@Request() req, @Body() setPasswordDto: SetPasswordDto) {
    await this.authService.setPassword(req.user.id, setPasswordDto);
    return { message: 'Password set successfully.' };
  }

  @ApiOperation({ summary: 'Get the profile of the current logged-in user (User Only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Returns the user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (or ToS not accepted).' })
  // --- [THE FIX] Add the TermsOfServiceGuard here, at the end of the list ---
  @UseGuards(JwtAuthGuard, RolesGuard, TermsOfServiceGuard)
  @Roles(RoleName.USER)
  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  // --- [THE FIX] Also protect the delete endpoint ---
  @UseGuards(JwtAuthGuard, RolesGuard, TermsOfServiceGuard)
  @Roles(RoleName.USER)
  @Delete('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete the account of the current logged-in user (User Only)' })
  async deleteProfile(@Request() req) {
    await this.usersService.remove(req.user.id);
    return { message: 'User account successfully deleted.' };
  }

  @Get('admin/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MODERATOR, RoleName.UPLOADER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current admin portal user's profile" })
  @ApiResponse({ status: 200, description: 'Returns the profile.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getAdminProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('admin/change-credentials')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the current admin's email or password (Admin Only)" })
  @ApiBody({ type: ChangeAdminCredentialsDto })
  @ApiResponse({ status: 200, description: 'Admin credentials updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  @ApiResponse({ status: 409, description: 'New email is already in use.' })
  changeAdminCredentials(@Request() req, @Body() changeAdminCredentialsDto: ChangeAdminCredentialsDto) {
    return this.authService.changeAdminCredentials(req.user.id, changeAdminCredentialsDto);
  }

  @ApiOperation({ summary: 'Admin: Force logout all sessions for a user' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'All sessions cleared for user.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  @ApiBody({ type: ForceLogoutDto })
  @Post('admin/force-logout')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USER_MANAGE)
  async forceLogoutAll(@Body() body: ForceLogoutDto) {
    await this.authService.forceLogoutAllSessions(body.userId);
    return { message: 'All sessions for user have been logged out.' };
  }

  @SkipTosCheck() // --- [NEW] ---
  @ApiOperation({ summary: 'Get a guest token (no credentials required)' })
  @ApiResponse({ status: 200, description: 'Returns a JWT token for guest access.' })
  @Post('guest-token')
  async guestToken() {
    return this.authService.guestToken();
  }

  @ApiOperation({ summary: 'Access an admin-only protected route' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Welcome message for admin.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @Get('admin-only')
  adminOnly(@Request() req) {
    return { message: `Welcome, Admin! Your role is '${req.user.roles.join(', ')}'.`, user: req.user };
  }
}