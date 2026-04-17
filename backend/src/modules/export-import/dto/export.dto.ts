import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum ExportEntityType {
  PRODUCTS = 'products',
  ORDERS = 'orders',
  USERS = 'users',
  ARTICLES = 'articles',
}

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

export class ExportDto {
  @IsEnum(ExportEntityType)
  entity_type: ExportEntityType;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}
