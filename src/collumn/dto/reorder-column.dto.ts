import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ColumnOrderItem {
  id!: string;
  order!: number;
}

export class ReorderColumnDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnOrderItem)
  columns!: ColumnOrderItem[];
}