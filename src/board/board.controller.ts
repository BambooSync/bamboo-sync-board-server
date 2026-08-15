import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('boards')
@UseGuards(JwtAuthGuard)   // gắn Guard cho TOÀN BỘ Controller, không cần lặp lại từng route
export class BoardController {
    constructor(private readonly boardService: BoardService) {}

    @Post()
    create(@Body() dto: CreateBoardDto, @CurrentUser() user: { id: string }) {
        return this.boardService.create(dto, user.id);
    }

    @Get()
    findAll(@CurrentUser() user: { id: string }) {
        return this.boardService.findAllForUser(user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
        return this.boardService.findOne(id, user.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateBoardDto, @CurrentUser() user: { id: string }) {
        return this.boardService.update(id, dto, user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
        return this.boardService.remove(id, user.id);
    }

    @Post('join/:inviteCode')
    join(@Param('inviteCode') inviteCode: string, @CurrentUser() user: { id: string }) {
        return this.boardService.joinByInviteCode(inviteCode, user.id);
    }
}