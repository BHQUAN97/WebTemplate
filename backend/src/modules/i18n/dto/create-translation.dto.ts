import { IsString, MaxLength } from 'class-validator';

export class CreateTranslationDto {
  @IsString()
  @MaxLength(10)
  locale: string;

  @IsString()
  @MaxLength(50)
  namespace: string;

  @IsString()
  @MaxLength(200)
  key: string;

  @IsString()
  value: string;
}
