import {
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
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
  constructor(private readonly quranService: QuranService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}


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
async getQuranStructure(): Promise<Juz[]> {
    const cacheKey = 'quran_structure';

    // This manual logic will now work correctly
    const cachedData = await this.cacheManager.get<Juz[]>(cacheKey);

    if (cachedData) {
      console.log('--- SUCCESS: Serving Quran structure from CACHE! ---');
      return cachedData;
    }

    console.log('--- INFO: Quran structure not in cache. Fetching from database... ---');
    const dbData = await this.quranService.getQuranStructure();

    await this.cacheManager.set(cacheKey, dbData, 86400);

    return dbData;
  }


  

  @Public()
  @Get('languages')
  @ApiOperation({ summary: 'Get all languages for which Tafsir is available' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of languages.',
    type: [Language],
  })
  async getAvailableLanguages(): Promise<Language[]> {
    const cacheKey = 'quran_languages';
    const cachedData = await this.cacheManager.get<Language[]>(cacheKey);
    if (cachedData) {
      console.log('--- SUCCESS: Serving available languages from CACHE! ---');
      return cachedData;
    }
    console.log('--- INFO: Languages not in cache. Fetching from database... ---');
    const dbData = await this.quranService.getAvailableLanguages();
    await this.cacheManager.set(cacheKey, dbData, 86400); // Cache for 24 hours
    return dbData;
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
  async getReciters(@Query() query: ReciterQueryDto): Promise<Reciter[]> {
    // Create a dynamic key. If languageId is null, it becomes 'reciters_lang_all'
    const cacheKey = `reciters_lang_${query.languageId || 'all'}`;
    
    const cachedData = await this.cacheManager.get<Reciter[]>(cacheKey);
    if (cachedData) {
      console.log(`--- SUCCESS: Serving reciters from CACHE! (Key: ${cacheKey}) ---`);
      return cachedData;
    }
    console.log(`--- INFO: Reciters not in cache. Fetching from database... (Key: ${cacheKey}) ---`);
    const dbData = await this.quranService.getReciters(query.languageId);
    await this.cacheManager.set(cacheKey, dbData, 86400); // Cache for 24 hours
    return dbData;
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