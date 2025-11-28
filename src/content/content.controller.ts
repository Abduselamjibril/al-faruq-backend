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
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Content } from './entities/content.entity';
import { CreateAudioTrackDto } from './dto/create-audio-track.dto';
import { AudioTrack } from './entities/audio-track.entity';
import { UpdateAudioTrackDto } from './dto/update-audio-track.dto';

@ApiTags('Content Management (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @ApiOperation({ summary: 'Create a new content item (movie, series, tafsir, etc.)' })
  @ApiBody({ type: CreateContentDto })
  @ApiResponse({ status: 201, description: 'Content successfully created.', type: Content })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 404, description: 'Parent content not found if parentId is provided.' })
  @Post()
  create(@Body() createContentDto: CreateContentDto) {
    return this.contentService.create(createContentDto);
  }

  @ApiOperation({ summary: 'Get all top-level content items (excluding Tafsir)' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of movies, series, and music videos.',
    type: [Content],
  })
  @Get()
  findAllTopLevel() {
    return this.contentService.findAllTopLevel();
  }

  @ApiOperation({ summary: 'Get a single content item with its full hierarchy' })
  @ApiResponse({
    status: 200,
    description: 'Returns the content item with its children (seasons/episodes/audio tracks).',
    type: Content,
  })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Get(':id')
  findOneWithHierarchy(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findOneWithHierarchy(id);
  }

  @ApiOperation({ summary: 'Update a content item' })
  @ApiBody({ type: UpdateContentDto })
  @ApiResponse({ status: 200, description: 'Content successfully updated.', type: Content })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    return this.contentService.update(id, updateContentDto);
  }

  @ApiOperation({ summary: 'Delete a content item and all its children' })
  @ApiResponse({ status: 200, description: 'Content successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id);
  }

  // --- [NEW] AUDIO TRACK MANAGEMENT ENDPOINTS ---

  @ApiOperation({
    summary: 'Add an audio track to a Quran Tafsir content item',
  })
  @ApiBody({ type: CreateAudioTrackDto })
  @ApiResponse({
    status: 201,
    description: 'Audio track successfully added.',
    type: AudioTrack,
  })
  @ApiResponse({
    status: 400,
    description: 'Content is not a QURAN_TAFSIR type.',
  })
  @ApiResponse({ status: 404, description: 'Content or Language not found.' })
  @ApiResponse({ status: 409, description: 'An audio track for this language already exists.' })
  @Post(':id/audio-tracks')
  addAudioTrack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createAudioTrackDto: CreateAudioTrackDto,
  ) {
    return this.contentService.addAudioTrack(id, createAudioTrackDto);
  }

  @ApiOperation({ summary: 'Update an audio track' })
  @ApiBody({ type: UpdateAudioTrackDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Audio track successfully updated.',
    type: AudioTrack,
  })
  @ApiResponse({ status: 404, description: 'Audio track not found.' })
  @Patch(':contentId/audio-tracks/:trackId')
  updateAudioTrack(
    @Param('contentId', ParseUUIDPipe) contentId: string, // Included for route consistency, but not used in service
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Body() updateAudioTrackDto: UpdateAudioTrackDto,
  ) {
    return this.contentService.updateAudioTrack(trackId, updateAudioTrackDto);
  }

  @ApiOperation({ summary: 'Delete an audio track' })
  @ApiResponse({
    status: 200,
    description: 'Audio track successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Audio track not found.' })
  @Delete(':contentId/audio-tracks/:trackId')
  @HttpCode(HttpStatus.OK)
  removeAudioTrack(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ) {
    return this.contentService.removeAudioTrack(trackId);
  }

  // --- END OF NEW ---

  @ApiOperation({ summary: 'Lock a content item and set its pricing' })
  @ApiBody({ type: CreatePricingDto })
  @ApiResponse({ status: 201, description: 'Content successfully locked and pricing set.', type: Content })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Post(':id/lock')
  lockContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createPricingDto: CreatePricingDto,
  ) {
    return this.contentService.lockContent(id, createPricingDto);
  }

  @ApiOperation({ summary: 'Unlock a content item' })
  @ApiResponse({ status: 200, description: 'Content successfully unlocked.', type: Content })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Patch(':id/unlock')
  @HttpCode(HttpStatus.OK)
  unlockContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.unlockContent(id);
  }
}