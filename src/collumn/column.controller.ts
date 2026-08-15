import { Controller, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ColumnService } from './column.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { ReorderColumnDto } from './dto/reorder-column.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ColumnController {
    constructor(private readonly columnService: ColumnService) {}

    @Post('boards/:boardId/columns')
    create(@Param('boardId') boardId: string, @Body() dto: CreateColumnDto) {
        return this.columnService.create(boardId, dto);
    }

    @Patch('boards/:boardId/columns/reorder')
    reorder(@Param('boardId') boardId: string, @Body() dto: ReorderColumnDto) {
        return this.columnService.reorder(boardId, dto);
    }

    @Delete('columns/:id')
    remove(@Param('id') id: string) {
        return this.columnService.remove(id);
    }
}