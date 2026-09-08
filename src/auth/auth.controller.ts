import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Đăng ký tài khoản người dùng mới' })
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Lấy thông tin profile người dùng hiện tại' })
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
