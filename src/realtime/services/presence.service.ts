import { Injectable } from '@nestjs/common';

interface OnlineMember {
  userId: string;
  email: string;
  socketId: string;
}

@Injectable()
export class PresenceService {
  private rooms = new Map<string, Map<string, OnlineMember>>();

  addMember(boardId: string, member: OnlineMember) {
    if (!this.rooms.has(boardId)) {
      this.rooms.set(boardId, new Map<string, OnlineMember>());
    }
    this.rooms.get(boardId)!.set(member.userId, member);
    return this.getOnlineMembers(boardId);
  }

  removeMember(boardId: string, socketId: string) {
    this.rooms.get(boardId)?.delete(socketId);
    return this.getOnlineMembers(boardId);
  }

  getOnlineMembers(boardId: string): OnlineMember[] {
    const room = this.rooms.get(boardId);
    return room ? Array.from(room.values()) : [];
  }
}
