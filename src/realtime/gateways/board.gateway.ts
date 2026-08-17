import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { TaskService } from '../../task/task.service';
import { PresenceService } from '../services/presence.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class BoardGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly taskService: TaskService,      // <-- DÙNG LẠI, không viết logic mới
    private readonly presenceService: PresenceService,
  ) {}

  @SubscribeMessage('room:join')
  handleJoinRoom(
    @MessageBody() data: { boardId: string; userId: string; email: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.boardId);
    client.data.boardId = data.boardId;
    client.data.userId = data.userId;

    const online = this.presenceService.addMember(data.boardId, {
      userId: data.userId,
      email: data.email,
      socketId: client.id,
    });

    this.server.to(data.boardId).emit('presence:update', online);
  }

  @SubscribeMessage('task:create')
  async handleTaskCreate(
    @MessageBody() data: { boardId: string; columnId: string; title: string },
    @ConnectedSocket() client: Socket,
  ) {
    const task = await this.taskService.create(
      data.columnId,
      { title: data.title },
      client.data.userId,
    );
    this.server.to(data.boardId).emit('task:created', task);   // broadcast CHO CẢ người gửi luôn (đồng bộ chắc chắn)
  }

  @SubscribeMessage('task:move')
  async handleTaskMove(
    @MessageBody() data: { boardId: string; taskId: string; toColumnId: string; newOrder: number },
    @ConnectedSocket() client: Socket,
  ) {
    const task = await this.taskService.move(
      data.taskId,
      { toColumnId: data.toColumnId, newOrder: data.newOrder },
      client.data.userId,
    );
    client.to(data.boardId).emit('task:moved', task);   // broadcast cho NGƯỜI KHÁC (người gửi đã tự update UI rồi)
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @MessageBody() data: { boardId: string; x: number; y: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.boardId).emit('cursor:update', {
      userId: client.data.userId,
      x: data.x,
      y: data.y,
    });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@MessageBody() data: { boardId: string; taskId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.boardId).emit('typing:update', { taskId: data.taskId, userId: client.data.userId, isTyping: true });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@MessageBody() data: { boardId: string; taskId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.boardId).emit('typing:update', { taskId: data.taskId, userId: client.data.userId, isTyping: false });
  }

  handleDisconnect(client: Socket) {
    const boardId = client.data.boardId;
    if (!boardId) return;
    const online = this.presenceService.removeMember(boardId, client.id);
    this.server.to(boardId).emit('presence:update', online);
  }
}