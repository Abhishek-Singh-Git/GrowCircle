import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/notification.dto';
import { OnEvent } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── CORE NOTIFICATION LOGIC ───────────────────────────────────────────
  async sendNotification(dto: CreateNotificationDto) {
    // 1. Check user preferences
    const prefs = await this.prisma.userPreference.findUnique({
      where: { userId: dto.userId },
    });

    if (prefs) {
      // Map event types to preference flags
      if (dto.type === 'nudge' && !prefs.notifyNudge) return null;
      if (dto.type === 'focus_alert' && !prefs.notifyFocusAlert) return null;
      if (dto.type === 'timeout' && !prefs.notifyTimeout) return null;
      if (dto.type === 'challenge' && !prefs.notifyChallenge) return null;
      if (dto.type === 'chat' && !prefs.notifyChat) return null;
      if (dto.type === 'badge' && !prefs.notifyBadge) return null;
      if (dto.type === 'streak' && !prefs.notifyStreak) return null;
      if (dto.type === 'partner_log' && !prefs.notifyPartnerLog) return null;
    }

    // 2. Persist in DB
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        metadata: dto.metadata,
      },
    });

    // 3. Dispatch to Push Provider (e.g., Firebase Cloud Messaging)
    this.dispatchPushNotification(notification);

    return notification;
  }

  private async dispatchPushNotification(notification: any) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: notification.userId },
        select: { fcmToken: true },
      });

      if (!user || !user.fcmToken) {
        this.logger.debug(`User ${notification.userId} has no FCM token. Skipping push.`);
        return;
      }

      // Check if it's an Expo token
      if (user.fcmToken.includes('ExponentPushToken') || user.fcmToken.includes('ExpoPushToken')) {
        this.logger.log(`User ${notification.userId} has an Expo token. Sending via Expo push service.`);
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.fcmToken,
            title: notification.title,
            body: notification.body,
            data: { type: notification.type, ...notification.metadata }
          })
        });
        return;
      }

      if (admin.apps.length === 0) {
        // Firebase not initialized yet
        this.logger.warn('Firebase Admin SDK is not initialized. Skipping push.');
        return;
      }

      const payload = {
        token: user.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          type: notification.type,
          ...notification.metadata,
        },
      };

      await admin.messaging().send(payload);
      this.logger.log(`Push notification sent to User ${notification.userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send push notification: ${error.message}`, error.stack);
    }
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getNotifications(userId: string, page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── EVENT LISTENERS ───────────────────────────────────────────────────

  @OnEvent('nudge.sent')
  async handleNudgeSent(payload: { nudge: any }) {
    await this.sendNotification({
      userId: payload.nudge.recipientId,
      type: 'nudge',
      title: 'New Nudge',
      body: payload.nudge.message || 'Someone nudged you!',
      metadata: { nudgeId: payload.nudge.id, circleId: payload.nudge.circleId },
    });
  }

  @OnEvent('challenge.created')
  async handleChallengeCreated(payload: { challenge: any }) {
    for (const participant of payload.challenge.participants) {
      if (participant.user.id !== payload.challenge.proposerId) {
        await this.sendNotification({
          userId: participant.user.id,
          type: 'challenge',
          title: 'New Challenge Request',
          body: `${payload.challenge.proposer.name} challenged you: ${payload.challenge.title}`,
          metadata: { challengeId: payload.challenge.id, circleId: payload.challenge.circleId },
        });
      }
    }
  }

  @OnEvent('challenge.resolved')
  async handleChallengeResolved(payload: { challenge: any }) {
    for (const participant of payload.challenge.participants) {
      await this.sendNotification({
        userId: participant.userId || participant.user?.id,
        type: 'challenge',
        title: 'Challenge Resolved',
        body: `The challenge "${payload.challenge.title}" has been resolved.`,
        metadata: { challengeId: payload.challenge.id, circleId: payload.challenge.circleId },
      });
    }
  }

  @OnEvent('challenge.activated')
  async handleChallengeActivated(payload: { challengeId: string; participants: any[] }) {
    for (const participant of payload.participants) {
      await this.sendNotification({
        userId: participant.userId,
        type: 'challenge',
        title: 'Challenge Activated',
        body: `Your challenge is now active! All participants have accepted.`,
        metadata: { challengeId: payload.challengeId },
      });
    }
  }

  @OnEvent('challenge.accepted')
  async handleChallengeAccepted(payload: { challenge: any; acceptorId: string }) {
    // Notify proposer and other participants
    const otherParticipants = payload.challenge.participants.filter(
      (p: any) => p.userId !== payload.acceptorId,
    );
    for (const participant of otherParticipants) {
      const acceptor = await this.prisma.user.findUnique({
        where: { id: payload.acceptorId },
        select: { name: true },
      });
      await this.sendNotification({
        userId: participant.userId,
        type: 'challenge',
        title: 'Challenge Accepted',
        body: `${acceptor?.name} accepted the challenge!`,
        metadata: { challengeId: payload.challenge.id },
      });
    }
  }

  @OnEvent('log.created')
  async handleLogCreated(payload: { log: any; userId: string; circleId: string; goalName: string; goalEmoji?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true },
    });
    if (!user) return;

    const otherMembers = await this.prisma.circleMember.findMany({
      where: {
        circleId: payload.circleId,
        status: 'active',
        userId: { not: payload.userId },
      },
      select: { userId: true },
    });

    const emoji = payload.goalEmoji || '✅';
    for (const member of otherMembers) {
      await this.sendNotification({
        userId: member.userId,
        type: 'partner_log',
        title: `${user.name} completed a goal!`,
        body: `${emoji} Completed: ${payload.goalName}`,
        metadata: {
          logId: payload.log.id,
          circleId: payload.circleId,
          userId: payload.userId,
        },
      });
    }
  }

  @OnEvent('chat.message_sent')
  async handleChatMessageSent(payload: { message: any; circleId: string; threadId: string }) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: payload.threadId },
      include: { participants: { select: { userId: true } } },
    });

    if (!thread) return;

    const sender = await this.prisma.user.findUnique({
      where: { id: payload.message.senderId },
      select: { name: true },
    });

    const otherParticipants = thread.participants.filter(
      (p) => p.userId !== payload.message.senderId,
    );

    for (const participant of otherParticipants) {
      await this.sendNotification({
        userId: participant.userId,
        type: 'chat',
        title: `${sender?.name} sent a message`,
        body: payload.message.content || '[Media message]',
        metadata: { threadId: payload.threadId, messageId: payload.message.id },
      });
    }
  }

  @OnEvent('intervention.created')
  async handleInterventionCreated(payload: { intervention: any; type: string; circleId: string }) {
    const initiator = await this.prisma.user.findUnique({
      where: { id: payload.intervention.initiatorId },
      select: { name: true },
    });

    await this.sendNotification({
      userId: payload.intervention.targetId,
      type: payload.type === 'timeout' ? 'timeout' : 'focus_alert',
      title: payload.type === 'timeout' ? '⏱️ App Timeout' : '🎯 Focus Alert',
      body: payload.type === 'timeout' 
        ? `${initiator?.name} has locked an app for you.`
        : `${initiator?.name} sent you a focus alert.`,
      metadata: { interventionId: payload.intervention.id, circleId: payload.circleId },
    });
  }

  @OnEvent('late_night.detected')
  async handleLateNightDetected(payload: { userId: string; circleId: string }) {
    const target = await this.prisma.user.findUnique({ where: { id: payload.userId }});
    const otherMembers = await this.prisma.circleMember.findMany({
      where: { circleId: payload.circleId, status: 'active', userId: { not: payload.userId } },
    });
    for (const member of otherMembers) {
      await this.sendNotification({
        userId: member.userId,
        type: 'partner_log',
        title: 'Late Night Alert 🦉',
        body: `${target?.name || 'Partner'} is still up late! Nudge them to sleep.`,
        metadata: { circleId: payload.circleId, targetId: payload.userId },
      });
    }
  }
}
