import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class TrackEventDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsString()
  @MaxLength(100)
  session_id: string;
}
