import { IsString, IsInt } from 'class-validator';

export class MoveTaskDto {
  @IsString()
  toColumnId!: string;

  @IsInt()
  newOrder!: number;
}