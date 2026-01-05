// src/privacy-policy/privacy-policy.controller.ts

import {
  Controller,
  UseGuards,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpStatus,
  HttpCode,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Ip,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrivacyPolicyService } from './privacy-policy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import { CreatePrivacyPolicyDto } from './dto/create-privacy-policy.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import type { Express } from 'express';
import { AcceptPrivacyPolicyDto } from './dto/accept-privacy-policy.dto';
import { Public } from '../auth/decorators/public.decorator';
import { PaginationQueryDto } from '../utils/pagination-query.dto'; // --- [NEW] IMPORT ---

@ApiTags('Privacy Policy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('privacy-policy')
export class PrivacyPolicyController {
  constructor(private readonly privacyPolicyService: PrivacyPolicyService) {}

  // --- PUBLIC ENDPOINT ---
  @Public()
  @Get('public/active')
  @ApiOperation({ summary: 'Public: Get the currently active privacy policy' })
  @ApiResponse({
    status: 200,
    description: 'The active privacy policy document details.',
  })
  @ApiResponse({ status: 404, description: 'No active policy found.' })
  getPubliclyActivePolicy() {
    return this.privacyPolicyService.getPubliclyActivePolicy();
  }

  // --- USER ENDPOINT ---
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.USER, RoleName.GUEST)
  @ApiOperation({ summary: 'User: Accept the current mandatory privacy policy' })
  @ApiResponse({ status: 200, description: 'Acceptance recorded successfully.' })
  @ApiResponse({ status: 400, description: 'No mandatory policy to accept.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Policy already accepted.' })
  acceptPolicy(
    @GetUser() user: User,
    @Body() acceptDto: AcceptPrivacyPolicyDto,
    @Ip() ipAddress: string,
  ) {
    return this.privacyPolicyService.recordAcceptance(
      user.id,
      acceptDto,
      ipAddress,
    );
  }

  // --- ADMIN ENDPOINTS ---
  @Post('admin')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleName.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Admin: Create a new privacy policy' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Multipart form data containing the policy metadata and the PDF file.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        version: { type: 'string' },
        description: { type: 'string' },
        effectiveDate: { type: 'string', format: 'date-time' },
        isActive: { type: 'boolean' },
        isMandatory: { type: 'boolean' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'The policy document (PDF only, max 20MB).',
        },
      },
      required: ['title', 'version', 'effectiveDate', 'file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The privacy policy has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input or file type.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not an admin.' })
  @ApiResponse({ status: 409, description: 'Conflict. Version already exists.' })
  create(
    @Body() createDto: CreatePrivacyPolicyDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @GetUser() admin: User,
  ) {
    return this.privacyPolicyService.create(createDto, file, admin.id);
  }

  @Get('admin')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Get all privacy policies' })
  @ApiResponse({ status: 200, description: 'List of all policies.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not an admin.' })
  findAllForAdmin() {
    return this.privacyPolicyService.findAllForAdmin();
  }

  // --- [NEW] ADMIN AUDIT ENDPOINT ---
  @Get('admin/:id/acceptances')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: "Admin: Get a paginated list of a policy's acceptances" })
  @ApiResponse({ status: 200, description: 'Paginated list of acceptances.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not an admin.' })
  @ApiResponse({ status: 404, description: 'Policy not found.' })
  getAcceptancesForPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginationDto: PaginationQueryDto,
  ) {
    return this.privacyPolicyService.getAcceptancesForPolicy(id, paginationDto);
  }

  @Patch('admin/:id/activate')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Activate a policy (deactivates others)' })
  @ApiResponse({ status: 200, description: 'Policy activated.' })
  @ApiResponse({ status: 404, description: 'Policy not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not an admin.' })
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.privacyPolicyService.updateActivationStatus(id, true);
  }

  @Patch('admin/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Deactivate a policy' })
  @ApiResponse({ status: 200, description: 'Policy deactivated.' })
  @ApiResponse({ status: 404, description: 'Policy not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not an admin.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.privacyPolicyService.updateActivationStatus(id, false);
  }

  @Patch('admin/:id/make-mandatory')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Make a policy mandatory (un-marks others)' })
  @ApiResponse({ status: 200, description: 'Policy marked as mandatory.' })
  @ApiResponse({ status: 404, description: 'Policy not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not an admin.' })
  makeMandatory(@Param('id', ParseIntPipe) id: number) {
    return this.privacyPolicyService.updateMandatoryStatus(id, true);
  }

  @Patch('admin/:id/make-optional')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Make a policy optional (not mandatory)' })
  @ApiResponse({ status: 200, description: 'Policy marked as optional.' })
  @ApiResponse({ status: 404, description: 'Policy not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not an admin.' })
  makeOptional(@Param('id', ParseIntPipe) id: number) {
    return this.privacyPolicyService.updateMandatoryStatus(id, false);
  }
}