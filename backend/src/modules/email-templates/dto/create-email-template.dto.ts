import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  html_body: string;

  @IsOptional()
  @IsString()
  text_body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
