import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
}

// Códigos de status usados pela API mas ausentes do enum HttpStatus desta versão do Nest.
const EXTRA_STATUS_NAMES: Record<number, string> = {
  423: 'LOCKED', // docs/04-API-SPEC.md POST /auth/login — conta bloqueada
};

/**
 * Converte qualquer exceção para o formato padrão de erro de docs/04-API-SPEC.md:
 * { "statusCode": 400, "error": "BAD_REQUEST", "message": "..." }
 *
 * Stack traces e detalhes de erro NUNCA expõem dados de usuário — docs/05-SECURITY.md seção 9.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject('LOGGER') private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { statusCode, body } = this.buildResponse(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`Erro não tratado: ${body.message}`, stack);
    }

    response.status(statusCode).json(body);
  }

  private buildResponse(exception: unknown): { statusCode: number; body: ErrorResponseBody } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const httpResponse = exception.getResponse();

      let message: string = exception.message;
      let extra: Record<string, unknown> = {};

      if (typeof httpResponse === 'object' && httpResponse !== null) {
        const responseObj = httpResponse as Record<string, unknown>;
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join('; ');
        } else if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { statusCode: _s, message: _m, error: _e, ...rest } = responseObj;
        extra = rest;
      }

      return {
        statusCode,
        body: {
          statusCode,
          error: HttpStatus[statusCode] ?? EXTRA_STATUS_NAMES[statusCode] ?? 'ERROR',
          message,
          ...extra,
        },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
      },
    };
  }
}
