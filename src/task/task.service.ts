import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  async create(columnId: string, dto: CreateTaskDto, userId: string) {
    const count = await this.prisma.task.count({ where: { columnId } });
    return this.prisma.task.create({
      data: {
        ...dto,
        order: count,
        columnId,
        updatedById: userId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task không tồn tại');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    await this.findOne(id); // kiểm tra tồn tại trước
    return this.prisma.task.update({
      where: { id },
      data: { ...dto, updatedById: userId },
    });
  }

  async move(id: string, dto: MoveTaskDto, userId: string) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: { columnId: dto.toColumnId, order: dto.newOrder, updatedById: userId },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.task.delete({ where: { id } });
  }
}