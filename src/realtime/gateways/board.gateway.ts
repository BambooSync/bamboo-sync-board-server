import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { PresenceService } from '../services/presence.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class BoardGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly presenceService: PresenceService) {}

  // ROOM
  @SubscribeMessage('room:join')
  handleJoinRoom(
    @MessageBody() data: { boardId: string; userId: string; email: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.boardId);

    client.data.boardId = data.boardId;
    client.data.userId = data.userId;
    client.data.email = data.email;

    const online = this.presenceService.addMember(data.boardId, {
      userId: data.userId,
      email: data.email,
      socketId: client.id,
    });

    this.server.to(data.boardId).emit('presence:update', online);
  }

  @SubscribeMessage('room:leave')
  handleLeaveRoom(
    @MessageBody() data: { boardId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.boardId);

    const online = this.presenceService.removeMember(
      data.boardId,
      client.id,
    );

    this.server.to(data.boardId).emit('presence:update', online);
    client.data.boardId = undefined;
  }

  // CURSOR
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

  // TYPING
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @MessageBody() data: { boardId: string; taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.boardId).emit('typing:update', {
      taskId: data.taskId,
      userId: client.data.userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { boardId: string; taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.boardId).emit('typing:update', {
      taskId: data.taskId,
      userId: client.data.userId,
      isTyping: false,
    });
  }

  // TASK EVENTS
  @OnEvent('task.created')
  handleTaskCreated(payload: { boardId: string; task: unknown }) {
    this.server.to(payload.boardId).emit('task:created', payload.task);
  }

  @OnEvent('task.updated')
  handleTaskUpdated(payload: { boardId: string; task: unknown }) {
    this.server.to(payload.boardId).emit('task:updated', payload.task);
  }

  @OnEvent('task.moved')
  handleTaskMoved(payload: { boardId: string; task: unknown }) {
    this.server.to(payload.boardId).emit('task:moved', payload.task);
  }

  @OnEvent('task.deleted')
  handleTaskDeleted(payload: { boardId: string; taskId: string }) {
    this.server.to(payload.boardId).emit('task:deleted', {
      taskId: payload.taskId,
    });
  }

  // DISCONNECT
  handleDisconnect(client: Socket) {
    const boardId = client.data.boardId;
    if (!boardId) return;

    const online = this.presenceService.removeMember(boardId, client.id);
    this.server.to(boardId).emit('presence:update', online);
  }
}