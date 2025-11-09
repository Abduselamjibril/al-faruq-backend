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
  ApiBody, // <-- IMPORT THIS
} from '@nestjs/swagger';
import { LoginUserDto } from './dto/login-user.dto'; // <-- AND IMPORT THIS

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

  // --- THIS IS THE CORRECTED METHOD ---
  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({ type: LoginUserDto }) // <-- ADD THIS DECORATOR
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
  async login(@Request() req, @Body() _loginDto: LoginUserDto) { // <-- ADD @Body() PARAMETER
    // The LocalAuthGuard has already validated the user and attached it to req.user.
    // The _loginDto parameter is not used in the function body, but its presence is
    // what allows Swagger to generate the correct documentation and UI.
    return this.authService.login(req.user);
  }
  // --- END OF CORRECTION ---

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

  @ApiExcludeEndpoint() // Exclude this from docs as it's a callback handled by the browser
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

  @ApiExcludeEndpoint() // Exclude this from docs as it's a callback handled by the browser
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