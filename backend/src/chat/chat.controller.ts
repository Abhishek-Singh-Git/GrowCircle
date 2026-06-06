import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateThreadDto, SendMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('threads')
  @HttpCode(HttpStatus.CREATED)
  async createThread(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateThreadDto,
  ) {
    return this.chatService.createThread(req.user.id, dto);
  }

  @Get('threads')
  async getThreads(
    @Request() req: { user: { id: string } },
    @Query('circle_id') circleId: string,
  ) {
    return this.chatService.getThreads(req.user.id, circleId);
  }

  @Post('threads/:threadId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Request() req: { user: { id: string } },
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.id, threadId, dto);
  }

  @Get('threads/:threadId/messages')
  async getMessages(
    @Request() req: { user: { id: string } },
    @Param('threadId') threadId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      req.user.id,
      threadId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }
}
