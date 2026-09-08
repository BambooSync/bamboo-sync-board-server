import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('columns/:columnId/tasks')
  create(
    @Param('columnId') columnId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.taskService.create(columnId, dto, user.id);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Patch('tasks/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.taskService.update(id, dto, user.id);
  }

  @Patch('tasks/:id/move')
  move(
    @Param('id') id: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.taskService.move(id, dto, user.id);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }
}
