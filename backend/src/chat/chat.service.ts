import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateThreadDto, SendMessageDto } from './dto/chat.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── THREADS ─────────────────────────────────────────────────────────
  async createThread(userId: string, dto: CreateThreadDto) {
    await this.circlesService.validateMembership(userId, dto.circleId);

    // Validate participants for direct threads
    if (dto.threadType === 'direct') {
      if (!dto.participantIds || dto.participantIds.length !== 2) {
        throw new BadRequestException('Direct threads require exactly 2 participants');
      }
      if (!dto.participantIds.includes(userId)) {
        throw new BadRequestException('You must be a participant in the thread');
      }
      // Check if thread already exists
      const existingThread = await this.prisma.chatThread.findFirst({
        where: {
          circleId: dto.circleId,
          threadType: 'direct',
          participants: {
            every: {
              userId: { in: dto.participantIds },
            },
          },
        },
      });
      if (existingThread) {
        return existingThread;
      }
    } else if (dto.threadType === 'group') {
      // For group threads, we'll add all active circle members
      const members = await this.prisma.circleMember.findMany({
        where: { circleId: dto.circleId, status: 'active' },
        select: { userId: true },
      });
      dto.participantIds = members.map(m => m.userId);
    }

    const participantsData = dto.participantIds!.map((id) => ({
      user: { connect: { id } },
    }));

    return this.prisma.chatThread.create({
      data: {
        circleId: dto.circleId,
        threadType: dto.threadType,
        participants: {
          create: participantsData,
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async getThreads(userId: string, circleId: string) {
    await this.circlesService.validateMembership(userId, circleId);

    return this.prisma.chatThread.findMany({
      where: {
        circleId,
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        // Include latest message
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          where: { isDeleted: false },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── MESSAGES ─────────────────────────────────────────────────────────
  async sendMessage(userId: string, threadId: string, dto: SendMessageDto) {
    if (!dto.content && !dto.mediaUrl) {
      throw new BadRequestException('Message must contain content or media');
    }

    // Validate participant
    const participant = await this.prisma.chatThreadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
      include: { thread: true },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderId: userId,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Update lastReadAt for sender
    await this.prisma.chatThreadParticipant.update({
      where: { threadId_userId: { threadId, userId } },
      data: { lastReadAt: new Date() },
    });

    // Emit event for real-time delivery
    this.eventEmitter.emit('chat.message_sent', {
      message,
      circleId: participant.thread.circleId,
      threadId,
    });

    return message;
  }

  async getMessages(userId: string, threadId: string, page = 1, limit = 50) {
    // Validate participant
    const participant = await this.prisma.chatThreadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    const whereClause: any = { threadId, isDeleted: false };
    if (participant.clearedAt) {
      whereClause.sentAt = { gt: participant.clearedAt };
    }

    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where: whereClause,
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: whereClause }),
    ]);

    // Mark as read asynchronously
    this.prisma.chatThreadParticipant.update({
      where: { threadId_userId: { threadId, userId } },
      data: { lastReadAt: new Date() },
    }).catch(() => {});

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async clearChat(userId: string, threadId: string) {
    const participant = await this.prisma.chatThreadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) throw new NotFoundException('Thread not found');

    await this.prisma.chatThreadParticipant.update({
      where: { threadId_userId: { threadId, userId } },
      data: { lastReadAt: new Date() },
    });

    return { clearedAt: new Date() };
  }

  async deleteThread(userId: string, threadId: string) {
    const participant = await this.prisma.chatThreadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    await this.prisma.message.updateMany({
      where: { threadId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return { deletedAt: new Date() };
  }
}
