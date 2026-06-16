import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage';
import { validate } from './config/env.validation';
import { LoggerModule } from './config/logger.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { REDIS_CLIENT, RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    LoggerModule,
    PrismaModule,
    RedisModule,
    CommonModule,
    // Rate limiting — docs/05-SECURITY.md seção 5:
    // 100 req/min por IP (anônimo) e 300 req/min por usuário autenticado
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [
          {
            name: 'ip',
            ttl: 60_000,
            limit: 100,
            skipIf: (context) => {
              const req = context.switchToHttp().getRequest<{ user?: { sub: string } }>();
              return Boolean(req.user?.sub);
            },
          },
          {
            name: 'user',
            ttl: 60_000,
            limit: 300,
            skipIf: (context) => {
              const req = context.switchToHttp().getRequest<{ user?: { sub: string } }>();
              return !req.user?.sub;
            },
            getTracker: (req: Record<string, unknown>) => {
              const user = (req as { user?: { sub: string } }).user;
              return user?.sub ?? (req as { ip: string }).ip;
            },
          },
        ],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // JwtAuthGuard roda antes do ThrottlerGuard para que req.user esteja
    // disponível ao throttler "user" em rotas autenticadas.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
