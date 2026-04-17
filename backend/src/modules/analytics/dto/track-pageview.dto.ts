import { IsString, IsOptional, MaxLength } from 'class-validator';

export class TrackPageviewDto {
  @IsString()
  @MaxLength(500)
  page_url: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  page_title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referer?: string;

  @IsString()
  @MaxLength(100)
  session_id: string;
}
