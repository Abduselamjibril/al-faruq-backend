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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import { AdminQuranService } from './admin-quran.service';
import { CreateReciterDto } from './dto/create-reciter.dto';
import { CreateTafsirDto } from './dto/create-tafsir.dto';
import { UpdateReciterDto } from './dto/update-reciter.dto';
import { UpdateTafsirDto } from './dto/update-tafsir.dto';

@ApiTags('Quran Management (Admin)')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@ApiBearerAuth()
@Controller('admin/quran')
export class AdminQuranController {
  constructor(private readonly adminQuranService: AdminQuranService) {}

  // --- Reciter Endpoints ---
  @Post('reciters')
  @ApiOperation({ summary: 'Create a new reciter' })
  createReciter(@Body() createReciterDto: CreateReciterDto) {
    return this.adminQuranService.createReciter(createReciterDto);
  }

  @Get('reciters')
  @ApiOperation({ summary: 'Get a list of all reciters' })
  findAllReciters() {
    return this.adminQuranService.findAllReciters();
  }

  @Patch('reciters/:id')
  @ApiOperation({ summary: 'Update a reciter' })
  updateReciter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReciterDto: UpdateReciterDto,
  ) {
    return this.adminQuranService.updateReciter(id, updateReciterDto);
  }

  @Delete('reciters/:id')
  @ApiOperation({ summary: 'Delete a reciter' })
  removeReciter(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminQuranService.removeReciter(id);
  }

  // --- Tafsir Endpoints ---
  @Post('tafsirs')
  @ApiOperation({ summary: 'Create a new tafsir audio entry' })
  createTafsir(@Body() createTafsirDto: CreateTafsirDto) {
    return this.adminQuranService.createTafsir(createTafsirDto);
  }


  @Get('tafsirs')
  @ApiOperation({ summary: 'Get a list of all tafsir entries' })
  findAllTafsirs() {
    return this.adminQuranService.findAllTafsirs();
  }

  @Patch('tafsirs/:id')
  @ApiOperation({ summary: 'Update a tafsir audio entry' })
  updateTafsir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTafsirDto: UpdateTafsirDto,
  ) {
    return this.adminQuranService.updateTafsir(id, updateTafsirDto);
  }

  @Delete('tafsirs/:id')
  @ApiOperation({ summary: 'Delete a tafsir audio entry' })
  removeTafsir(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminQuranService.removeTafsir(id);
  }
}