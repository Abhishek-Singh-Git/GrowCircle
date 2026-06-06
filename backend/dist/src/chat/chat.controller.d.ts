import { ChatService } from './chat.service';
import { CreateThreadDto, SendMessageDto } from './dto/chat.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    createThread(req: {
        user: {
            id: string;
        };
    }, dto: CreateThreadDto): Promise<{
        id: string;
        createdAt: Date;
        circleId: string;
        threadType: string;
    }>;
    getThreads(req: {
        user: {
            id: string;
        };
    }, circleId: string): Promise<({
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
    sendMessage(req: {
        user: {
            id: string;
        };
    }, threadId: string, dto: SendMessageDto): Promise<{
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
    getMessages(req: {
        user: {
            id: string;
        };
    }, threadId: string, page?: string, limit?: string): Promise<{
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
