import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Patch('v1/users/me')
  async updateUser(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: body.fcmToken },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('v1/users/me/preferences')
  async getPreferences(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    let prefs = await this.prisma.userPreference.findUnique({
      where: { userId },
    });
    if (!prefs) {
      prefs = await this.prisma.userPreference.create({
        data: { userId },
      });
    }
    return prefs;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('v1/users/me/preferences')
  async updatePreferences(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    return this.prisma.userPreference.upsert({
      where: { userId },
      update: body,
      create: { userId, ...body },
    });
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
