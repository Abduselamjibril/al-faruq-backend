import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';
import { Match } from '../decorators/match.decorator';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

export class ChangeAdminCredentialsDto {
  @ApiPropertyOptional({
    description: "Admin's new email address",
    example: 'new.admin@example.com',
  })
  @IsOptional()
  @IsEmail()
  @Trim()
  @Escape()
  email?: string;

  @ApiPropertyOptional({
    description: "Admin's new password (at least 8 characters)",
    example: 'NewSecureP@ssword123',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsStrongPassword({ message: 'Password must include uppercase, lowercase, number, and special character.' })
  @Trim()
  @Escape()
  newPassword?: string;

  @ApiPropertyOptional({
    description: 'Confirmation of the new password, must match newPassword',
    example: 'NewSecureP@ssword123',
  })
  @IsOptional()
  @IsString()
  @IsStrongPassword({ message: 'Password must include uppercase, lowercase, number, and special character.' })
  @Match('newPassword', { message: 'Passwords do not match' })
  @Trim()
  @Escape()
  confirmPassword?: string;
}