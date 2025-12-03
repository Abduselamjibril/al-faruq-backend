// src/quran/quran.controller.ts

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Language } from '../content/entities/language.entity';
import { Juz } from './entities/juz.entity';
import { Reciter } from './entities/reciter.entity';
import { ReciterQueryDto } from './dto/reciter-query.dto';
import {
  QuranService,
  RecitationsByReciter,
  RecitationsBySurah,
} from './quran.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';

@ApiTags('Quran (User-Facing)')
// [REMOVED] No security decorators at the controller level
@Controller('quran')
export class QuranController {
  constructor(private readonly quranService: QuranService) {}

  @Public() // This decorator ensures guards like a global JWT guard would be skipped.
  @Get('structure')
  @ApiOperation({
    summary: 'Get the entire structure of the Quran (all Juz and Surahs)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a nested list of all 30 Juz and their 114 Surahs.',
    type: [Juz],
  })
  getQuranStructure(): Promise<Juz[]> {
    return this.quranService.getQuranStructure();
  }

  @Public()
  @Get('languages')
  @ApiOperation({ summary: 'Get all languages for which Tafsir is available' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of languages.',
    type: [Language],
  })
  getAvailableLanguages(): Promise<Language[]> {
    return this.quranService.getAvailableLanguages();
  }

  @Public()
  @Get('reciters')
  @ApiOperation({
    summary: 'Get a list of reciters, optionally filtered by language',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of reciter profiles.',
    type: [Reciter],
  })
  getReciters(@Query() query: ReciterQueryDto): Promise<Reciter[]> {
    return this.quranService.getReciters(query.languageId);
  }

  // --- [CORRECT] Security is now applied ONLY to this endpoint ---
  @Get('surahs/:surahId/recitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '[Protected] Get all available recitations for a specific Surah, grouped by reciter.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns a list of reciters, each with their recitations for the given Surah and language.',
  })
  getRecitationsForSurah(
    @Param('surahId', ParseIntPipe) surahId: number,
    @Query('languageId', ParseUUIDPipe) languageId: string,
  ): Promise<RecitationsByReciter[]> {
    return this.quranService.getRecitationsForSurah(surahId, languageId);
  }

  // --- [CORRECT] Security is now applied ONLY to this endpoint ---
  @Get('reciters/:reciterId/recitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '[Protected] Get all available recitations for a specific Reciter, grouped by Surah.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns a list of Surahs, each with the recitations by the given Reciter and language.',
  })
  getRecitationsForReciter(
    @Param('reciterId', ParseUUIDPipe) reciterId: string,
    @Query('languageId', ParseUUIDPipe) languageId: string,
  ): Promise<RecitationsBySurah[]> {
    return this.quranService.getRecitationsForReciter(reciterId, languageId);
  }
}