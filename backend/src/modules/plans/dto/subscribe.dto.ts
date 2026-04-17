import { IsString, MaxLength } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @MaxLength(26)
  plan_id: string;
}
