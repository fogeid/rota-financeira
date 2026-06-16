import { Global, Module } from '@nestjs/common';
import { WinstonModule, WINSTON_MODULE_NEST_PROVIDER, utilities } from 'nest-winston';
import * as winston from 'winston';

/**
 * Logger estruturado (Winston). Configuração de formato sensível a ambiente.
 * Nenhum interceptor/filtro deste projeto loga CPF, senha, tokens ou OTP —
 * docs/05-SECURITY.md seção 9.
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transports: [
        new winston.transports.Console({
          format:
            process.env.NODE_ENV === 'production'
              ? winston.format.combine(winston.format.timestamp(), winston.format.json())
              : winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.ms(),
                  utilities.format.nestLike('RotaFinanceira', { prettyPrint: true }),
                ),
        }),
      ],
    }),
  ],
  providers: [
    {
      provide: 'LOGGER',
      useExisting: WINSTON_MODULE_NEST_PROVIDER,
    },
  ],
  exports: ['LOGGER', WINSTON_MODULE_NEST_PROVIDER],
})
export class LoggerModule {}
