// src/terms-of-service/terms-of-service.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TermsOfServiceService } from './terms-of-service.service';
import { CreateTermsOfServiceDto } from './dto/create-terms-of-service.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// --- Guards and Decorators ---
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard'; // --- [FIXED] Use RolesGuard ---
import { Roles } from '../auth/decorators/roles.decorator'; // --- [NEW] Import Roles decorator ---
import { RoleName } from '../roles/entities/role.entity'; // --- [NEW] Import RoleName enum ---
import { SkipTosCheck } from './decorators/skip-tos-check.decorator';

@ApiTags('Terms of Service')
@Controller('terms-of-service')
export class TermsOfServiceController {
  constructor(private readonly termsOfServiceService: TermsOfServiceService) {}

  // =================================================================
  // == Public Endpoint                                           ==
  // =================================================================

  @SkipTosCheck()
  @Get('public/latest')
  @ApiOperation({
    summary: 'Get the latest active and mandatory Terms of Service',
    description:
      'Provides the content for the mobile app to display to the user before they accept.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the latest mandatory ToS content or null if none exist.',
  })
  findActiveMandatory() {
    return this.termsOfServiceService.findActiveMandatory();
  }

  // =================================================================
  // == Authenticated User Endpoint                               ==
  // =================================================================

  @SkipTosCheck()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Accept the latest mandatory Terms of Service',
    description:
      'A logged-in user calls this to record their acceptance of the latest mandatory ToS.',
  })
  @ApiResponse({ status: 204, description: 'ToS accepted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async accept(@Req() req) {
    const userId = req.user.id;
    const activeTos = await this.termsOfServiceService.findActiveMandatory();
    if (activeTos) {
      await this.termsOfServiceService.accept(userId, activeTos.id);
    }
  }

  // =================================================================
  // == Admin Endpoints                                           ==
  // =================================================================

  @UseGuards(JwtAuthGuard, RolesGuard) // --- [FIXED] Use RolesGuard ---
  @Roles(RoleName.ADMIN) // --- [NEW] Specify that only Admins can access this ---
  @ApiBearerAuth()
  @Post('admin')
  @ApiOperation({ summary: 'ADMIN: Create a new ToS version' })
  @ApiResponse({ status: 201, description: 'The ToS version was created.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() createDto: CreateTermsOfServiceDto) {
    return this.termsOfServiceService.create(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) // --- [FIXED] ---
  @Roles(RoleName.ADMIN) // --- [NEW] ---
  @ApiBearerAuth()
  @Get('admin')
  @ApiOperation({ summary: 'ADMIN: Get all ToS versions' })
  @ApiResponse({ status: 200, description: 'Returns all ToS versions.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll() {
    return this.termsOfServiceService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) // --- [FIXED] ---
  @Roles(RoleName.ADMIN) // --- [NEW] ---
  @ApiBearerAuth()
  @Patch('admin/:id/activate')
  @ApiOperation({
    summary: 'ADMIN: Activate a ToS version',
    description:
      'Sets a specific ToS version as active. Any other previously active version will be deactivated.',
  })
  @ApiResponse({ status: 200, description: 'The ToS version was activated.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'ToS version not found.' })
  activate(@Param('id') id: string) {
    return this.termsOfServiceService.activate(id);
  }
   @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth()
  @Patch('admin/:id/make-mandatory')
  @ApiOperation({
    summary: 'ADMIN: Make a ToS version mandatory',
    description: 'Sets a specific ToS version as mandatory for all users. Any other version will be made non-mandatory.',
  })
  @ApiResponse({ status: 200, description: 'The ToS version was made mandatory.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'ToS version not found.' })
  makeMandatory(@Param('id') id: string) {
    return this.termsOfServiceService.makeMandatory(id);
  }
}