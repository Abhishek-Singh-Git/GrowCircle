"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const circles_service_1 = require("../circles/circles.service");
const event_emitter_1 = require("@nestjs/event-emitter");
let ChatService = class ChatService {
    prisma;
    circlesService;
    eventEmitter;
    constructor(prisma, circlesService, eventEmitter) {
        this.prisma = prisma;
        this.circlesService = circlesService;
        this.eventEmitter = eventEmitter;
    }
    async createThread(userId, dto) {
        await this.circlesService.validateMembership(userId, dto.circleId);
        if (dto.threadType === 'direct') {
            if (!dto.participantIds || dto.participantIds.length !== 2) {
                throw new common_1.BadRequestException('Direct threads require exactly 2 participants');
            }
            if (!dto.participantIds.includes(userId)) {
                throw new common_1.BadRequestException('You must be a participant in the thread');
            }
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
        }
        else if (dto.threadType === 'group') {
            const members = await this.prisma.circleMember.findMany({
                where: { circleId: dto.circleId, status: 'active' },
                select: { userId: true },
            });
            dto.participantIds = members.map(m => m.userId);
        }
        const participantsData = dto.participantIds.map((id) => ({
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
    async getThreads(userId, circleId) {
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
                messages: {
                    orderBy: { sentAt: 'desc' },
                    take: 1,
                    where: { isDeleted: false },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async sendMessage(userId, threadId, dto) {
        if (!dto.content && !dto.mediaUrl) {
            throw new common_1.BadRequestException('Message must contain content or media');
        }
        const participant = await this.prisma.chatThreadParticipant.findUnique({
            where: { threadId_userId: { threadId, userId } },
            include: { thread: true },
        });
        if (!participant) {
            throw new common_1.ForbiddenException('You are not a participant in this thread');
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
        await this.prisma.chatThreadParticipant.update({
            where: { threadId_userId: { threadId, userId } },
            data: { lastReadAt: new Date() },
        });
        this.eventEmitter.emit('chat.message_sent', {
            message,
            circleId: participant.thread.circleId,
            threadId,
        });
        return message;
    }
    async getMessages(userId, threadId, page = 1, limit = 50) {
        const participant = await this.prisma.chatThreadParticipant.findUnique({
            where: { threadId_userId: { threadId, userId } },
        });
        if (!participant) {
            throw new common_1.ForbiddenException('You are not a participant in this thread');
        }
        const [items, total] = await Promise.all([
            this.prisma.message.findMany({
                where: { threadId, isDeleted: false },
                include: {
                    sender: { select: { id: true, name: true, avatarUrl: true } },
                },
                orderBy: { sentAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.message.count({ where: { threadId, isDeleted: false } }),
        ]);
        this.prisma.chatThreadParticipant.update({
            where: { threadId_userId: { threadId, userId } },
            data: { lastReadAt: new Date() },
        }).catch(() => { });
        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        circles_service_1.CirclesService,
        event_emitter_1.EventEmitter2])
], ChatService);
//# sourceMappingURL=chat.service.js.map