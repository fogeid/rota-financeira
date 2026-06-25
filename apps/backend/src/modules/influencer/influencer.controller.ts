import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { InfluencerService } from './influencer.service';
import { ApplyInfluencerDto } from './dto/apply-influencer.dto';
import { UpdatePixKeyDto } from './dto/update-pix-key.dto';

@ApiTags('Influencer')
@Controller('influencer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InfluencerController {
  constructor(private readonly influencerService: InfluencerService) {}

  @Post('apply')
  @Public()
  @ApiOperation({ summary: 'Candidatura para programa de influencers (público)' })
  apply(@Body() dto: ApplyInfluencerDto) {
    return this.influencerService.apply(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Perfil e histórico de comissões do influencer' })
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.influencerService.getMyProfile(user.sub);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard completo do influencer (apenas APPROVED)' })
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.influencerService.getDashboard(user.sub);
  }

  @Patch('pix-key')
  @ApiOperation({ summary: 'Cadastra ou atualiza chave PIX do influencer' })
  updatePixKey(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePixKeyDto) {
    return this.influencerService.updatePixKey(user.sub, dto);
  }

  @Patch('admin/:id/approve')
  @ApiOperation({ summary: '[Admin] Aprova influencer e desativa código de motorista' })
  approveInfluencer(@Param('id') id: string) {
    return this.influencerService.approveInfluencer(id);
  }

  @Patch('admin/:id/suspend')
  @ApiOperation({ summary: '[Admin] Suspende influencer e reativa código de motorista' })
  suspendInfluencer(@Param('id') id: string) {
    return this.influencerService.suspendOrRejectInfluencer(id, 'SUSPENDED');
  }

  @Patch('admin/:id/reject')
  @ApiOperation({ summary: '[Admin] Rejeita influencer e reativa código de motorista' })
  rejectInfluencer(@Param('id') id: string) {
    return this.influencerService.suspendOrRejectInfluencer(id, 'REJECTED');
  }
}
