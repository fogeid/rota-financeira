import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminRole, InfluencerStatus, InfluencerTier, WithdrawalStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { CurrentAdmin, CurrentAdminUser } from './decorators/current-admin.decorator';
import { AdminService } from './admin.service';

class RejectSuspendDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class UpdateTierDto {
  @IsEnum(InfluencerTier)
  tier!: InfluencerTier;
}

@Public()
@Controller('admin')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ─────────────────────────────────────────────────────────────

  @Get('dashboard/overview')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  // ── Usuários ──────────────────────────────────────────────────────────────

  @Get('users')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_DRIVER, AdminRole.SUPPORT_DRIVER_INFLUENCER)
  listUsers(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.listUsers(search, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('users/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_DRIVER, AdminRole.SUPPORT_DRIVER_INFLUENCER)
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_DRIVER, AdminRole.SUPPORT_DRIVER_INFLUENCER)
  deactivateUser(@Param('id') id: string, @CurrentAdmin() admin: CurrentAdminUser) {
    return this.adminService.deactivateUser(id, admin.id);
  }

  @Patch('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_DRIVER, AdminRole.SUPPORT_DRIVER_INFLUENCER)
  reactivateUser(@Param('id') id: string, @CurrentAdmin() admin: CurrentAdminUser) {
    return this.adminService.reactivateUser(id, admin.id);
  }

  // ── Influencers ───────────────────────────────────────────────────────────

  @Get('influencers')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_INFLUENCER, AdminRole.SUPPORT_DRIVER_INFLUENCER)
  listInfluencers(@Query('status') status?: InfluencerStatus) {
    return this.adminService.listInfluencers(status);
  }

  @Get('influencers/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_INFLUENCER, AdminRole.SUPPORT_DRIVER_INFLUENCER)
  getInfluencerById(@Param('id') id: string) {
    return this.adminService.getInfluencerById(id);
  }

  @Patch('influencers/:id/approve')
  @HttpCode(HttpStatus.OK)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_INFLUENCER, AdminRole.SUPPORT_DRIVER_INFLUENCER)
  approveInfluencer(@Param('id') id: string, @CurrentAdmin() admin: CurrentAdminUser) {
    return this.adminService.approveInfluencer(id, admin.id);
  }

  @Patch('influencers/:id/reject')
  @HttpCode(HttpStatus.OK)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_INFLUENCER, AdminRole.SUPPORT_DRIVER_INFLUENCER)
  rejectInfluencer(
    @Param('id') id: string,
    @Body() dto: RejectSuspendDto,
    @CurrentAdmin() admin: CurrentAdminUser,
  ) {
    return this.adminService.rejectInfluencer(id, dto.reason ?? '', admin.id);
  }

  @Patch('influencers/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_INFLUENCER, AdminRole.SUPPORT_DRIVER_INFLUENCER)
  suspendInfluencer(
    @Param('id') id: string,
    @Body() dto: RejectSuspendDto,
    @CurrentAdmin() admin: CurrentAdminUser,
  ) {
    return this.adminService.suspendInfluencer(id, dto.reason ?? '', admin.id);
  }

  @Patch('influencers/:id/tier')
  @HttpCode(HttpStatus.OK)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  updateInfluencerTier(
    @Param('id') id: string,
    @Body() dto: UpdateTierDto,
    @CurrentAdmin() admin: CurrentAdminUser,
  ) {
    return this.adminService.updateInfluencerTier(id, dto.tier, admin.id);
  }

  // ── Financeiro ────────────────────────────────────────────────────────────

  @Get('withdrawals')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  listWithdrawals(@Query('status') status?: WithdrawalStatus) {
    return this.adminService.listWithdrawals(status);
  }

  @Patch('withdrawals/:id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @AdminRoles(AdminRole.SUPER_ADMIN)
  markWithdrawalPaid(@Param('id') id: string, @CurrentAdmin() admin: CurrentAdminUser) {
    return this.adminService.markWithdrawalPaid(id, admin.id);
  }

  @Get('commissions')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  listCommissions(@Query('month') month?: string) {
    return this.adminService.listCommissions(month);
  }

  // ── Auditoria ─────────────────────────────────────────────────────────────

  @Get('audit-logs')
  getAuditLogs(
    @CurrentAdmin() admin: CurrentAdminUser,
    @Query('admin_id') adminId?: string,
    @Query('action') action?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getAuditLogs(
      admin,
      adminId,
      action,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
