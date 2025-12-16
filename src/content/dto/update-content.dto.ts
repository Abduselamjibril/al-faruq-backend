// src/content/dto/update-content.dto.ts
import { PartialType } from '@nestjs/swagger'; // Make sure to import from @nestjs/swagger
import { CreateContentDto } from './create-content.dto';

// UpdateContentDto inherits all validation and API properties from CreateContentDto,
// but marks all fields as optional for Swagger documentation.
export class UpdateContentDto extends PartialType(CreateContentDto) {
	// Optional YouTube URL for update
	youtubeUrl?: string;
}