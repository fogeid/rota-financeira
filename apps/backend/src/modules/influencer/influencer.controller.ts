import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InfluencerService } from './influencer.service';
import { ApplyInfluencerDto } from './dto/apply-influencer.dto';

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
}
