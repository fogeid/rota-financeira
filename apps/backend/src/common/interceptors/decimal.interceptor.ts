import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Decimal } from '@prisma/client/runtime/library';

function convertDecimals(obj: unknown): unknown {
  if (obj instanceof Decimal) return obj.toNumber();
  if (Array.isArray(obj)) return obj.map(convertDecimals);
  if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      result[key] = convertDecimals((obj as Record<string, unknown>)[key]);
    }
    return result;
  }
  return obj;
}

@Injectable()
export class DecimalInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => convertDecimals(data)));
  }
}
