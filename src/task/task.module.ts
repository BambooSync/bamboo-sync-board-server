import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';

@Module({
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService], // QUAN TRỌNG: export để RealtimeModule dùng lại sau này
})
export class TaskModule {}
