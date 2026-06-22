import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InfluencerService } from './influencer.service';
import { ApplyInfluencerDto } from './dto/apply-influencer.dto';
import { InfluencerLoginDto } from './dto/influencer-login.dto';
import { UpdatePixKeyDto } from './dto/update-pix-key.dto';

@ApiTags('Influencer')
@Controller('influencer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InfluencerController {
  constructor(private readonly influencerService: InfluencerService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Candidatura para programa de influencers' })
  apply(@CurrentUser('id') userId: string, @Body() dto: ApplyInfluencerDto) {
    return this.influencerService.apply(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Perfil e histórico de comissões do influencer' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.influencerService.getMyProfile(userId);
  }

  @Post('auth/login')
  @Public()
  @ApiOperation({ summary: 'Login do influencer via e-mail + senha (dashboard web)' })
  loginInfluencer(@Body() dto: InfluencerLoginDto) {
    return this.influencerService.loginInfluencer(dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard completo do influencer (apenas APPROVED)' })
  getDashboard(@CurrentUser('id') userId: string) {
    return this.influencerService.getDashboard(userId);
  }

  @Patch('pix-key')
  @ApiOperation({ summary: 'Cadastra ou atualiza chave PIX do influencer' })
  updatePixKey(@CurrentUser('id') userId: string, @Body() dto: UpdatePixKeyDto) {
    return this.influencerService.updatePixKey(userId, dto);
  }
}
