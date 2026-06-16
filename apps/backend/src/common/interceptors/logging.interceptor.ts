import { CallHandler, ExecutionContext, Inject, Injectable, LoggerService, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

/**
 * Loga apenas metadados da requisição (método, rota, status, duração, request_id, user_id).
 * NUNCA loga body, query params ou headers — docs/05-SECURITY.md seção 9.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject('LOGGER') private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: { sub: string } }>();
    const response = context.switchToHttp().getResponse<Response>();

    const requestId = randomUUID();
    request.headers['x-request-id'] = requestId;
    response.setHeader('X-Request-Id', requestId);

    const start = Date.now();
    const { method, path } = request;

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            method,
            path,
            status: response.statusCode,
            duration_ms: Date.now() - start,
            request_id: requestId,
            user_id: request.user?.sub,
          }),
        );
      }),
    );
  }
}
