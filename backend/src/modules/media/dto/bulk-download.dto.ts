import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

/**
 * DTO cho bulk download media — mang ids cac media can zip.
 * Max 100 items. Kiem tra tong size lam o service.
 */
export class BulkDownloadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids: string[];
}
