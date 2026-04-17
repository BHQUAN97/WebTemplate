import { IsString, IsEmail, IsObject, IsOptional } from 'class-validator';

export class SendEmailDto {
  @IsString()
  template_name: string;

  @IsEmail()
  to: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
