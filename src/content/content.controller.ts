// src/content/content.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { LockContentDto } from './dto/lock-content.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Content } from './entities/content.entity';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { RejectContentDto } from './dto/reject-content.dto';

@ApiTags('Content Management (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @Permissions(PERMISSIONS.CONTENT_UPLOAD)
  @ApiOperation({ summary: 'Create a new content item (Uploader, Admin)' })
  @ApiBody({ type: CreateContentDto })
  @ApiResponse({ status: 201, description: 'Content successfully created.', type: Content })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  @ApiResponse({ status: 404, description: 'Parent content not found if parentId is provided.' })
  create(@Body() createContentDto: CreateContentDto, @GetUser() user: User) {
    return this.contentService.create(createContentDto, user.id);
  }

  @Get()
  @Permissions(PERMISSIONS.CONTENT_MANAGE_ALL)
  @ApiOperation({ summary: 'Get all top-level content items (Moderator, Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'contentType', required: false, type: String, description: 'Filter by content type (e.g., MOVIE, SERIES, etc.)' })
  @ApiResponse({ status: 200, description: 'Returns a paginated array of all top-level content.', schema: { $ref: '#/components/schemas/PaginationResponseDto' } })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  findAllTopLevel(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('contentType') contentType?: string,
  ) {
    return this.contentService.findAllTopLevelPaginated(page, limit, contentType);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CONTENT_MANAGE_ALL)
  @ApiOperation({ summary: 'Get a single content item with its full hierarchy (Moderator, Admin)' })
  @ApiResponse({ status: 200, description: 'Returns the content item with its children.', type: Content })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  findOneWithHierarchy(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findOneWithHierarchy(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CONTENT_EDIT_OWN, PERMISSIONS.CONTENT_MANAGE_ALL)
  @ApiOperation({ summary: 'Update a content item (Owner, Moderator, Admin)' })
  @ApiBody({ type: UpdateContentDto })
  @ApiResponse({ status: 200, description: 'Content successfully updated.', type: Content })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions or not the owner.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContentDto: UpdateContentDto,
    @GetUser() user: any,
  ) {
    return this.contentService.update(id, updateContentDto, user);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CONTENT_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a content item and all its children (Admin Only)' })
  @ApiResponse({ status: 200, description: 'Content successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id);
  }

  // --- Workflow Endpoints ---
  @Post(':id/submit')
  @Permissions(PERMISSIONS.CONTENT_EDIT_OWN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a draft for review (Owner Only)' })
  @ApiResponse({ status: 200, description: 'Content submitted for review.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not the owner.' })
  submitForReview(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: any) {
    return this.contentService.submitForReview(id, user);
  }

  @Post(':id/approve')
  @Permissions(PERMISSIONS.CONTENT_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve content and publish it (Moderator, Admin)' })
  @ApiResponse({ status: 200, description: 'Content has been published.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  approveContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.approveContent(id);
  }

  @Post(':id/reject')
  @Permissions(PERMISSIONS.CONTENT_REJECT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject content and send it back to draft (Moderator, Admin)' })
  @ApiResponse({ status: 200, description: 'Content has been sent back to draft.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  rejectContent(@Param('id', ParseUUIDPipe) id: string, @Body() rejectDto: RejectContentDto) {
    return this.contentService.rejectContent(id, rejectDto);
  }

  @Patch(':id/archive')
  @Permissions(PERMISSIONS.CONTENT_DELETE) // Archiving is a powerful action, suitable for admins
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive published content (Admin Only)' })
  @ApiResponse({ status: 200, description: 'Content has been archived.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  archiveContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.archiveContent(id);
  }

  @Patch(':id/restore')
  @Permissions(PERMISSIONS.CONTENT_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore archived content to published state (Admin Only)' })
  @ApiResponse({ status: 200, description: 'Content has been restored.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  restoreContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.restoreContent(id);
  }
  
  // --- Pricing Endpoints ---
  @Post(':id/lock')
  @Permissions(PERMISSIONS.PRICING_MANAGE)
  @ApiOperation({ summary: 'Lock a content item and set its price (Admin Only)' })
  @ApiBody({ type: LockContentDto })
  @ApiResponse({ status: 201, description: 'Content successfully locked and pricing set.', type: Content })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  lockContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() lockContentDto: LockContentDto,
  ) {
    return this.contentService.lockContent(id, lockContentDto);
  }

  @Patch(':id/unlock')
  @Permissions(PERMISSIONS.PRICING_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock a content item, making it free (Admin Only)' })
  @ApiResponse({ status: 200, description: 'Content successfully unlocked.', type: Content })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  unlockContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.unlockContent(id);
  }
}