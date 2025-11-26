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

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 409,
    description: 'Email or phone number already in use.',
  })
  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized, invalid credentials.',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() _loginDto: LoginUserDto) {
    return this.authService.login(req.user);
  }

  @ApiOperation({ summary: 'Initiate Google SSO flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google for authentication.',
  })
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard handles the redirect
  }

  @ApiExcludeEndpoint()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const { access_token } = await this.authService.login(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
  }

  @ApiOperation({ summary: 'Initiate Facebook SSO flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Facebook for authentication.',
  })
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookAuth() {
    // Guard handles the redirect
  }

  @ApiExcludeEndpoint()
  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookAuthRedirect(@Request() req, @Res() res: Response) {
    const { access_token } = await this.authService.login(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
  }

  @ApiOperation({ summary: 'Request a password reset OTP' })
  @ApiResponse({
    status: 200,
    description: 'A confirmation message is always returned.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(forgotPasswordDto.email);
    return {
      message:
        'If an account with that email exists, a password reset OTP has been sent.',
    };
  }

  @ApiOperation({ summary: 'Reset password using an OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password has been reset successfully.' };
  }

  @ApiOperation({ summary: 'Change password for a logged-in user' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or incorrect current password.',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(req.user.id, changePasswordDto);
    return { message: 'Password changed successfully.' };
  }

  @ApiOperation({ summary: 'Get the profile of the current logged-in user' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Returns the user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  // --- ADMIN-ONLY ENDPOINTS ---

  @Get('admin/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current admin's profile (Admin Only)" })
  @ApiResponse({ status: 200, description: 'Returns the admin profile.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getAdminProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  // --- THIS ENDPOINT HAS BEEN UPDATED ---
  @Patch('admin/change-credentials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the current admin's email or password (Admin Only)" })
  // ADDED ApiBody decorator for a clear example
  @ApiBody({ type: ChangeAdminCredentialsDto })
  @ApiResponse({ status: 200, description: 'Admin credentials updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'New email is already in use.' })
  changeAdminCredentials(
    @Request() req,
    @Body() changeAdminCredentialsDto: ChangeAdminCredentialsDto,
  ) {
    return this.authService.changeAdminCredentials(req.user.id, changeAdminCredentialsDto);
  }
  // --- END OF UPDATE ---

  @ApiOperation({ summary: 'Access an admin-only protected route' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Welcome message for admin.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User is not an admin.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('admin-only')
  adminOnly(@Request() req) {
    return {
      message: `Welcome, Admin! You can see this because your role is '${req.user.role}'.`,
      user: req.user,
    };
  }
}