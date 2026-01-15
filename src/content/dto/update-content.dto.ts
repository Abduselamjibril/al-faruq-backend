// src/content/dto/update-content.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateContentDto } from './create-content.dto';

// UpdateContentDto inherits all validation and API properties from our updated CreateContentDto.
// The PartialType utility automatically marks all fields, including the new 'media' array,
// as optional. This is exactly what we need for update operations.
export class UpdateContentDto extends PartialType(CreateContentDto) {
  // No additional properties are needed here.
  // The 'youtubeUrl' and the new 'media' array are already included and optional
  // because of `PartialType(CreateContentDto)`.
}