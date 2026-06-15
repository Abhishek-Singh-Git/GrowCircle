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
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        recipientId: string;
        circleId: string;
        goalInstanceId: string | null;
        message: string | null;
        id: string;
        result: string | null;
        sentAt: Date;
        senderId: string;
    }>;
    getNudges(req: {
        user: {
            id: string;
        };
    }, circleId: string, sentBy: 'me' | 'others', page?: string, limit?: string): Promise<{
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
            recipientId: string;
            circleId: string;
            goalInstanceId: string | null;
            message: string | null;
            id: string;
            result: string | null;
            sentAt: Date;
            senderId: string;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
