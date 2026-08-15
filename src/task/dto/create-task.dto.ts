import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Priority } from '@prisma/client';   // <-- import enum thật từ Prisma Client đã generate

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)              // <-- dùng enum Priority thay vì mảng string tay
  priority?: Priority;            // <-- kiểu đúng là Priority, không phải string

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}