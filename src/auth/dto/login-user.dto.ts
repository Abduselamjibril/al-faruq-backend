import { IsNotEmpty, IsString } from 'class-validator';
export class LoginUserDto {
  @IsString()
  @IsNotEmpty()
  loginIdentifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}