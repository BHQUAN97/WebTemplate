import { IsString, IsOptional, IsObject } from 'class-validator';

export class PreviewEmailDto {
  @IsString()
  template_id: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
