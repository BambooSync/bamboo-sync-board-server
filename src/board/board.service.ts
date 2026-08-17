import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBoardDto, ownerId: string) { // Create a new board with default columns and add the owner as a member
    return this.prisma.board.create({
      data: {
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
        ownerId,
        columns: {
          create: [
            { name: 'To Do', order: 0 },
            { name: 'Doing', order: 1 },
            { name: 'Done', order: 2 },
          ],
        },
        members: {
          create: { userId: ownerId, memberRole: 'OWNER' },
        },
      },
      include: { columns: true },
    });
  }

  async findAllForUser(userId: string) { // Take all boards where the user is either the owner or a member
    return this.prisma.board.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: { owner: true },
    });
  }

  async findOne(id: string, userId: string) { // Check if the user is a member or owner of the board
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        owner: true,
        columns: { include: { tasks: true }, orderBy: { order: 'asc' } },
        members: true,
      },
    });

    if (!board) throw new NotFoundException('Board not exist');

    const isMember = board.ownerId === userId || board.members.some(m => m.userId === userId);
    if (!isMember) throw new ForbiddenException('You do not have permission to view this board');

    return board;
  }

  async update(id: string, dto: UpdateBoardDto, userId: string) { // Check if the user is the owner or an editor of the board
    await this.checkOwnerOrEditor(id, userId);
    return this.prisma.board.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) { // Check if the user is the owner of the board

    const board = await this.prisma.board.findUnique({ where: { id } });
    if (!board) throw new NotFoundException('Board not exist');
    if (board.ownerId !== userId) throw new ForbiddenException('Only the owner can delete the board');

    return this.prisma.board.delete({ where: { id } });
  }

  async joinByInviteCode(inviteCode: string, userId: string) {
    const board = await this.prisma.board.findUnique({ where: { inviteCode } });
    if (!board) throw new NotFoundException('Invite link is invalid');
    if (!board.isPublic) throw new ForbiddenException('This board does not allow joining via link');

    const existing = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: board.id, userId } },
    });
    if (existing) return board; // đã là member rồi, không tạo trùng

    await this.prisma.boardMember.create({
      data: { boardId: board.id, userId, memberRole: 'EDITOR' },
    });

    return board;
  }

  private async checkOwnerOrEditor(boardId: string, userId: string) { // Check if the user is the owner or an editor of the board
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!member || member.memberRole === 'VIEWER') {
      throw new ForbiddenException('You do not have permission to edit this board');
    }
  }
}