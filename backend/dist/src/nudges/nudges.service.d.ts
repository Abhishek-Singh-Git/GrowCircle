import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { SendNudgeDto } from './dto/nudge.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class NudgesService {
    private readonly prisma;
    private readonly circlesService;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, circlesService: CirclesService, eventEmitter: EventEmitter2);
    sendNudge(senderId: string, dto: SendNudgeDto): Promise<{
        sender: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        message: string | null;
        id: string;
        result: string | null;
        circleId: string;
        goalId: string | null;
        goalInstanceId: string | null;
        sentAt: Date;
        senderId: string;
        recipientId: string;
    }>;
    getNudges(userId: string, circleId: string, sentBy: 'me' | 'others', page?: number, limit?: number): Promise<{
        items: ({
            sender: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            recipient: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            message: string | null;
            id: string;
            result: string | null;
            circleId: string;
            goalId: string | null;
            goalInstanceId: string | null;
            sentAt: Date;
            senderId: string;
            recipientId: string;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
