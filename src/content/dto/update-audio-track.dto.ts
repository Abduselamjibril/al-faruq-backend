// src/content/dto/update-audio-track.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateAudioTrackDto } from './create-audio-track.dto';

// For PATCH operations, we can allow updating the audioUrl or the languageId.
// All fields are optional.
export class UpdateAudioTrackDto extends PartialType(CreateAudioTrackDto) {}