import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class ChangeAdminCredentialsDto {
  @ApiPropertyOptional({
    description: "Admin's new email address",
    example: 'new.admin@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: "Admin's new password (at least 8 characters)",
    example: 'NewSecureP@ssword123',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword?: string;

  @ApiPropertyOptional({
    description: 'Confirmation of the new password, must match newPassword',
    example: 'NewSecureP@ssword123',
  })
  @IsOptional()
  @IsString()
  @Match('newPassword', { message: 'Passwords do not match' })
  confirmPassword?: string;
}