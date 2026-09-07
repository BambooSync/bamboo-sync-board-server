import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BoardGateway } from './gateways/board.gateway';
import { PresenceService } from './services/presence.service';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [TaskModule, JwtModule.register({})],
  providers: [BoardGateway, PresenceService],
})
export class RealtimeModule {}
