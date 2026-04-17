import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Options cho PDF generation (puppeteer).
 * Tat ca optional — service co default sensible.
 */
export class PdfOptionsDto {
  @IsOptional()
  @IsIn(['A4', 'Letter'])
  format?: 'A4' | 'Letter';

  @IsOptional()
  @IsBoolean()
  landscape?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  marginTop?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  marginBottom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  marginLeft?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  marginRight?: string;

  @IsOptional()
  @IsBoolean()
  printBackground?: boolean;
}

/**
 * DTO cho POST /api/export/pdf.
 * Nhan HTML string (da render tu FE) va convert ra PDF buffer qua puppeteer.
 *
 * `html` bi gioi han 1MB (1_048_576 chars) de tranh OOM khi launch Chromium.
 */
export class ExportPdfDto {
  @IsString()
  @MaxLength(1_048_576, { message: 'HTML qua lon (max 1MB)' })
  html: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  filename?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PdfOptionsDto)
  options?: PdfOptionsDto;
}
