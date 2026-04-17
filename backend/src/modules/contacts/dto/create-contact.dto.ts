import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  message: string;
}
