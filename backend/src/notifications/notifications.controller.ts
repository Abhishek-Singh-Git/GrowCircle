import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Request() req: { user: { id: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const safePage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const safeLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 50 : parsedLimit;
    return this.notificationsService.getNotifications(
      req.user.id,
      safePage,
      safeLimit,
    );
  }

  @Put(':notificationId/read')
  async markAsRead(
    @Request() req: { user: { id: string } },
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, notificationId);
  }
}
