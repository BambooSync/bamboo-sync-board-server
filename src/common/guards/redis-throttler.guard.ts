import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RedisThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(RedisThrottlerGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (err: unknown) {
      if (err instanceof ThrottlerException) {
        throw err;
      }
      this.logger.warn(
        `Throttler storage encountered an error, bypassing rate limit: ${String(err)}`,
      );
      return true;
    }
  }
}
