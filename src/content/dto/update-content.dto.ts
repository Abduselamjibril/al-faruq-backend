import { PartialType } from '@nestjs/mapped-types';
import { CreateContentDto } from './create-content.dto';

// UpdateContentDto inherits all validation rules from CreateContentDto,
// but marks all fields as optional.
export class UpdateContentDto extends PartialType(CreateContentDto) {}