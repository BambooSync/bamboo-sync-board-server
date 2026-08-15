import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;
}