import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext, Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
    const port = Number(this.configService.get<number>('REDIS_PORT', 6379));

    try {
      const pubClient = new Redis({
        host,
        port,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        retryStrategy: (times) =>
          times > 3 ? null : Math.min(times * 200, 2000),
      });
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        this.logger.warn(`RedisIoAdapter pubClient error: ${String(err)}`);
      });
      subClient.on('error', (err) => {
        this.logger.warn(`RedisIoAdapter subClient error: ${String(err)}`);
      });

      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(
        `RedisIoAdapter connected to Redis at ${host}:${port} successfully.`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to connect RedisIoAdapter at ${host}:${port}. Operating with default in-memory Socket.io adapter. Error: ${String(err)}`,
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
