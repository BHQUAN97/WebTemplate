import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';

/**
 * DTO cho POST /api/export/{csv,xlsx,pdf}.
 * Frontend truyen du lieu da xu ly (array of plain object) + ten file.
 *
 * `data` bi gioi han max 10_000 rows de tranh OOM.
 */
export class ExportDataDto {
  @IsArray()
  @ArrayMaxSize(10000)
  data: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  filename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  /**
   * Danh sach key/column can lay (theo thu tu). Neu khong truyen thi tu detect
   * tu row dau tien.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  columns?: string[];

  /**
   * Optional header labels (cung do dai voi `columns`). Neu khong co → dung
   * key lam header.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  headers?: string[];
}
