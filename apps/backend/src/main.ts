import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // rawBody: true necessário para validação HMAC do webhook Pagar.me (docs/05-SECURITY.md seção 7)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  // Tamanho máximo do body: 1MB — docs/04-API-SPEC.md "Regras Gerais da API"
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  // Headers de segurança — docs/05-SECURITY.md seção 5
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      frameguard: { action: 'deny' },
      xXssProtection: true,
    }),
  );

  // CORS — apenas origens autorizadas, nunca '*' — docs/05-SECURITY.md seção 5
  const frontendUrl = config.get<string>('FRONTEND_URL');
  app.enableCors({
    origin: frontendUrl ? frontendUrl.split(',') : false,
  });

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Rota Financeira API')
    .setDescription('API do Rota Financeira — gestão financeira para motoristas de aplicativo')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(config.get<number>('PORT', 3000));
}

bootstrap();
