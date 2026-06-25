import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { InfluencerModule } from '../influencer/influencer.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets injetados explicitamente nos services (ConfigService)
    InfluencerModule,
  ],
  controllers: [AdminAuthController, AdminController],
  providers: [
    AdminAuthService,
    AdminService,
    AdminAuditService,
    AdminJwtStrategy,
    AdminJwtGuard,
    AdminRolesGuard,
  ],
})
export class AdminModule {}
