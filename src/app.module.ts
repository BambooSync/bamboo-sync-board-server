import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BoardModule } from './board/board.module';
import { ColumnModule } from './collumn/column.module';
import { TaskModule } from './task/task.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RedisModule } from './redis/redis.module';
import { RedisThrottlerGuard } from './common/guards/redis-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', '127.0.0.1');
        const port = Number(configService.get<number>('REDIS_PORT', 6379));

        return {
          throttlers: [
            {
              name: 'default',
              ttl: seconds(60),
              limit: 60,
            },
          ],
          storage: new ThrottlerStorageRedisService(
            new Redis({
              host,
              port,
              lazyConnect: true,
              maxRetriesPerRequest: 2,
              retryStrategy: (times) =>
                times > 3 ? null : Math.min(times * 200, 2000),
            }),
          ),
        };
      },
    }),
    AuthModule,
    BoardModule,
    ColumnModule,
    TaskModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RedisThrottlerGuard,
    },
  ],
})
export class AppModule {}
