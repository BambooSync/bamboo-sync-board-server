import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @SkipThrottle()
  @Get('health')
  async healthCheck() {
    const userCount = await this.prisma.user.count();
    return { status: 'ok', userCount };
  }
}
