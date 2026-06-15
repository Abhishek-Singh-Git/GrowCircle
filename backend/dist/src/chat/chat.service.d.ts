import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateThreadDto, SendMessageDto } from './dto/chat.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ChatService {
    private readonly prisma;
    private readonly circlesService;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, circlesService: CirclesService, eventEmitter: EventEmitter2);
    createThread(userId: string, dto: CreateThreadDto): Promise<{
        circleId: string;
        id: string;
        createdAt: Date;
        threadType: string;
    }>;
    getThreads(userId: string, circleId: string): Promise<({
        participants: ({
            user: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            userId: string;
            joinedAt: Date;
            threadId: string;
            lastReadAt: Date | null;
            clearedAt: Date | null;
        })[];
        messages: {
            id: string;
            deletedAt: Date | null;
            threadId: string;
            content: string | null;
            mediaUrl: string | null;
            mediaType: string | null;
            sentAt: Date;
            isDeleted: boolean;
            senderId: string;
        }[];
    } & {
        circleId: string;
        id: string;
        createdAt: Date;
        threadType: string;
    })[]>;
    sendMessage(userId: string, threadId: string, dto: SendMessageDto): Promise<{
        sender: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        deletedAt: Date | null;
        threadId: string;
        content: string | null;
        mediaUrl: string | null;
        mediaType: string | null;
        sentAt: Date;
        isDeleted: boolean;
        senderId: string;
    }>;
    getMessages(userId: string, threadId: string, page?: number, limit?: number): Promise<{
        items: ({
            sender: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            deletedAt: Date | null;
            threadId: string;
            content: string | null;
            mediaUrl: string | null;
            mediaType: string | null;
            sentAt: Date;
            isDeleted: boolean;
            senderId: string;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    clearChat(userId: string, threadId: string): Promise<{
        clearedAt: Date;
    }>;
    deleteThread(userId: string, threadId: string): Promise<{
        deletedAt: Date;
    }>;
}
