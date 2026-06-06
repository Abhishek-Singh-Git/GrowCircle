import { NudgesService } from './nudges.service';
import { SendNudgeDto } from './dto/nudge.dto';
export declare class NudgesController {
    private readonly nudgesService;
    constructor(nudgesService: NudgesService);
    sendNudge(req: {
        user: {
            id: string;
        };
    }, dto: SendNudgeDto): Promise<{
        sender: {
            name: string;
            id: string;
            avatarUrl: string | null;
        };
    } & {
        message: string | null;
        result: string | null;
        id: string;
        circleId: string;
        goalId: string | null;
        goalInstanceId: string | null;
        sentAt: Date;
        senderId: string;
        recipientId: string;
    }>;
    getNudges(req: {
        user: {
            id: string;
        };
    }, circleId: string, sentBy: 'me' | 'others', page?: string, limit?: string): Promise<{
        items: ({
            sender: {
                name: string;
                id: string;
                avatarUrl: string | null;
            };
            recipient: {
                name: string;
                id: string;
                avatarUrl: string | null;
            };
        } & {
            message: string | null;
            result: string | null;
            id: string;
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
