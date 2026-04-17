import {
  IsString,
  IsOptional,
  IsArray,
  IsUrl,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateWebhookDto {
  @IsUrl()
  @MaxLength(500)
  url: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  events: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  secret?: string;
}
