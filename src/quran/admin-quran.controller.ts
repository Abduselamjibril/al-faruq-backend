// src/quran/admin-quran.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminQuranService } from './admin-quran.service';
import { CreateReciterDto } from './dto/create-reciter.dto';
import { CreateTafsirDto } from './dto/create-tafsir.dto';
import { UpdateReciterDto } from './dto/update-reciter.dto';
import { UpdateTafsirDto } from './dto/update-tafsir.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';

@ApiTags('Quran Management (Admin)')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.QURAN_MANAGE)
@ApiBearerAuth()
@Controller('admin/quran')
export class AdminQuranController {
  constructor(private readonly adminQuranService: AdminQuranService) {}

  // --- Reciter Endpoints ---
  @Post('reciters')
  @ApiOperation({ summary: 'Create a new reciter' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  createReciter(@Body() createReciterDto: CreateReciterDto) {
    return this.adminQuranService.createReciter(createReciterDto);
  }

  @Get('reciters')
  @ApiOperation({ summary: 'Get a list of all reciters' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  findAllReciters() {
    return this.adminQuranService.findAllReciters();
  }

  @Patch('reciters/:id')
  @ApiOperation({ summary: 'Update a reciter' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  updateReciter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReciterDto: UpdateReciterDto,
  ) {
    return this.adminQuranService.updateReciter(id, updateReciterDto);
  }

  @Delete('reciters/:id')
  @ApiOperation({ summary: 'Delete a reciter' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  removeReciter(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminQuranService.removeReciter(id);
  }

  // --- Tafsir Endpoints ---
  @Post('tafsirs')
  @ApiOperation({ summary: 'Create a new tafsir audio entry' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  createTafsir(@Body() createTafsirDto: CreateTafsirDto) {
    return this.adminQuranService.createTafsir(createTafsirDto);
  }

  @Get('tafsirs')
  @ApiOperation({ summary: 'Get a list of all tafsir entries' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  findAllTafsirs() {
    return this.adminQuranService.findAllTafsirs();
  }

  @Patch('tafsirs/:id')
  @ApiOperation({ summary: 'Update a tafsir audio entry' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  updateTafsir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTafsirDto: UpdateTafsirDto,
  ) {
    return this.adminQuranService.updateTafsir(id, updateTafsirDto);
  }

  @Delete('tafsirs/:id')
  @ApiOperation({ summary: 'Delete a tafsir audio entry' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  removeTafsir(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminQuranService.removeTafsir(id);
  }
}