import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './services/login-throttle.service';
import { OtpDeliveryService } from './services/otp-delivery.service';
import { OtpService } from './services/otp.service';
import { OtpResendThrottleService } from './services/otp-resend-throttle.service';
import { PendingRegistrationService } from './services/pending-registration.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [
    ReferralModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES', '15m') as StringValue },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OtpService,
    OtpDeliveryService,
    OtpResendThrottleService,
    LoginThrottleService,
    PendingRegistrationService,
    JwtStrategy,
  ],
  exports: [TokenService, OtpService],
})
export class AuthModule {}
