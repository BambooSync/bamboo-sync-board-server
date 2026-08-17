import { Module } from '@nestjs/common';
import { BoardGateway } from './gateways/board.gateway';
import { PresenceService } from './services/presence.service';
import { TaskModule } from '../task/task.module';

@Module({
    imports: [TaskModule],   // import để lấy được TaskService (đã export ở TaskModule trước đó)
    providers: [BoardGateway, PresenceService],
})
export class RealtimeModule {}