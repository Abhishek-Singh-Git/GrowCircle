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
        id: string;
        createdAt: Date;
        circleId: string;
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
            lastReadAt: Date | null;
            threadId: string;
        })[];
        messages: {
            id: string;
            deletedAt: Date | null;
            content: string | null;
            mediaUrl: string | null;
            mediaType: string | null;
            threadId: string;
            sentAt: Date;
            isDeleted: boolean;
            senderId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        circleId: string;
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
        content: string | null;
        mediaUrl: string | null;
        mediaType: string | null;
        threadId: string;
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
            content: string | null;
            mediaUrl: string | null;
            mediaType: string | null;
            threadId: string;
            sentAt: Date;
            isDeleted: boolean;
            senderId: string;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
