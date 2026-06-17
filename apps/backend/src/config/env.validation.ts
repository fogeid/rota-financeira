import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsNumber()
  PORT = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES = '15m';

  @IsString()
  JWT_REFRESH_EXPIRES = '30d';

  @IsString()
  @MinLength(32)
  ENCRYPTION_MASTER_KEY!: string;

  @IsString()
  @MinLength(32)
  FIELD_ENCRYPTION_KEY!: string;

  @IsString()
  @MinLength(32)
  HASH_SECRET!: string;

  // Pagar.me — docs/05-SECURITY.md seção 7
  @IsString()
  @MinLength(16)
  PAGARME_API_KEY!: string;

  @IsString()
  @MinLength(16)
  PAGARME_WEBHOOK_SECRET!: string;

  // Firebase FCM — optional; push notifications disabled when absent
  @IsOptional()
  @IsString()
  FIREBASE_PROJECT_ID?: string;

  @IsOptional()
  @IsString()
  FIREBASE_PRIVATE_KEY?: string;

  @IsOptional()
  @IsString()
  FIREBASE_CLIENT_EMAIL?: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Configuração de ambiente inválida: ${errors.toString()}`);
  }

  return validatedConfig;
}
