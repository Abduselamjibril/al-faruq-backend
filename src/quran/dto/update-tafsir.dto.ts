// src/quran/dto/update-tafsir.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateTafsirDto } from './create-tafsir.dto';

export class UpdateTafsirDto extends PartialType(CreateTafsirDto) {
	// Optional YouTube URL for update
	youtubeUrl?: string;
}