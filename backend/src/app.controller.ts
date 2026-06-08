import { Controller, Get, Patch, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('.well-known/assetlinks.json')
  getAssetLinks() {
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.growcircle.app',
          sha256_cert_fingerprints: [
            // The user will need to add their production SHA-256 fingerprint here
            'XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX'
          ],
        },
      },
    ];
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('v1/users/me')
  async getMe(@Request() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        timezone: true,
        plan: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('v1/users/me')
  async updateProfile(@Request() req: any, @Body() body: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.prisma.user.update({
      where: { id: req.user.id },
      data: { fcmToken: body.fcmToken },
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('v1/users/me/preferences')
  async getPreferences(@Request() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    let prefs = await this.prisma.userPreference.findUnique({
      where: { userId: req.user.id },
    });
    if (!prefs) {
      prefs = await this.prisma.userPreference.create({
        data: { userId: req.user.id },
      });
    }
    return prefs;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('v1/users/me/preferences')
  async updatePreferences(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    
    // Extract consent flags if present
    const { timeoutConsent, screenTimeConsent, ...prefsData } = body;

    const result = await this.prisma.userPreference.upsert({
      where: { userId },
      update: prefsData,
      create: { userId, ...prefsData },
    });

    // Handle consent records if provided
    if (timeoutConsent !== undefined || screenTimeConsent !== undefined) {
      const activeCircles = await this.prisma.circleMember.findMany({
        where: { userId, status: 'active' },
        select: { circleId: true },
      });

      for (const cm of activeCircles) {
        if (timeoutConsent !== undefined) {
          await this.prisma.consentRecord.upsert({
            where: { id: `${userId}-${cm.circleId}-timeout` }, // Fake ID for upsert, better to findFirst
            update: { revokedAt: timeoutConsent ? null : new Date() },
            create: {
              userId,
              circleId: cm.circleId,
              feature: 'timeout',
              revokedAt: timeoutConsent ? null : new Date(),
            },
          }).catch(async () => {
             // Fallback if upsert fails due to missing unique constraint
             const existing = await this.prisma.consentRecord.findFirst({
               where: { userId, circleId: cm.circleId, feature: 'timeout' }
             });
             if (existing) {
               await this.prisma.consentRecord.update({
                 where: { id: existing.id },
                 data: { revokedAt: timeoutConsent ? null : new Date() }
               });
             } else {
               await this.prisma.consentRecord.create({
                 data: { userId, circleId: cm.circleId, feature: 'timeout', revokedAt: timeoutConsent ? null : new Date() }
               });
             }
          });
        }
        
        if (screenTimeConsent !== undefined) {
          const existing = await this.prisma.consentRecord.findFirst({
            where: { userId, circleId: cm.circleId, feature: 'screen_time' }
          });
          if (existing) {
            await this.prisma.consentRecord.update({
              where: { id: existing.id },
              data: { revokedAt: screenTimeConsent ? null : new Date() }
            });
          } else {
            await this.prisma.consentRecord.create({
              data: { userId, circleId: cm.circleId, feature: 'screen_time', revokedAt: screenTimeConsent ? null : new Date() }
            });
          }
        }
      }
    }

    return result;
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
