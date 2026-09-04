import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(columnId: string, dto: CreateTaskDto, userId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (!column) throw new NotFoundException('Column không tồn tại');

    const count = await this.prisma.task.count({ where: { columnId } });
    const task = await this.prisma.task.create({
      data: {
        ...dto,
        order: count,
        columnId,
        updatedById: userId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });

    this.eventEmitter.emit('task.created', {
      boardId: column.boardId,
      task,
    });

    return task;
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task không tồn tại');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    await this.findOne(id); // kiểm tra tồn tại trước
    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        updatedById: userId,
      },
      include: {
        column: {
          select: { boardId: true },
        },
      },
    });

    const { column, ...task } = updatedTask;

    this.eventEmitter.emit('task.updated', {
      boardId: column.boardId,
      task,
    });

    return task;
  }

  async move(id: string, dto: MoveTaskDto, userId: string) {
    await this.findOne(id);
    const movedTask = await this.prisma.task.update({
      where: { id },
      data: {
        columnId: dto.toColumnId,
        order: dto.newOrder,
        updatedById: userId,
      },
      include: {
        column: {
          select: { boardId: true },
        },
      },
    });

    const { column, ...task } = movedTask;

    this.eventEmitter.emit('task.moved', {
      boardId: column.boardId,
      task,
    });

    return task;
  }

  async remove(id: string) {
    const existing = await this.prisma.task.findUnique({
      where: { id },
      include: {
        column: {
          select: { boardId: true },
        },
      },
    });
    if (!existing) throw new NotFoundException('Task không tồn tại');

    const deleted = await this.prisma.task.delete({ where: { id } });

    this.eventEmitter.emit('task.deleted', {
      boardId: existing.column.boardId,
      taskId: id,
    });

    return deleted;
  }
}
