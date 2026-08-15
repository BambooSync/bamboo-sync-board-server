import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { ReorderColumnDto } from './dto/reorder-column.dto';

@Injectable()
export class ColumnService {
  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, dto: CreateColumnDto) {
    const count = await this.prisma.column.count({ where: { boardId } });
    return this.prisma.column.create({
      data: { name: dto.name, order: count, boardId },
    });
  }

  async reorder(boardId: string, dto: ReorderColumnDto) {
    // Cập nhật order hàng loạt trong 1 transaction — đảm bảo không bị lệch nếu có lỗi giữa chừng
    return this.prisma.$transaction(
      dto.columns.map(col =>
        this.prisma.column.update({
          where: { id: col.id },
          data: { order: col.order },
        }),
      ),
    );
  }

  async remove(id: string) {
    const column = await this.prisma.column.findUnique({ where: { id } });
    if (!column) throw new NotFoundException('Column không tồn tại');
    return this.prisma.column.delete({ where: { id } }); // cascade tự xóa task con
  }
}