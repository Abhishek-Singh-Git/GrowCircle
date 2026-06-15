import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateInterventionDto } from './dto/interventions.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class InterventionsService {
    private readonly prisma;
    private readonly circlesService;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, circlesService: CirclesService, eventEmitter: EventEmitter2);
    createIntervention(initiatorId: string, dto: CreateInterventionDto): Promise<{
        initiator: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        target: {
            id: string;
            name: string;
        };
    } & {
        circleId: string;
        id: string;
        status: string;
        expiresAt: Date | null;
        durationSeconds: number | null;
        targetId: string;
        appPackage: string | null;
        interventionType: string;
        overrideAt: Date | null;
        overrideReason: string | null;
        initiatedAt: Date;
        initiatorId: string;
    }>;
    overrideIntervention(userId: string, interventionId: string, reason?: string): Promise<{
        overriddenAt: Date | null;
    }>;
    getInterventions(userId: string, circleId: string, dateFrom?: string, dateTo?: string, page?: number, limit?: number): Promise<{
        items: ({
            initiator: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            target: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            circleId: string;
            id: string;
            status: string;
            expiresAt: Date | null;
            durationSeconds: number | null;
            targetId: string;
            appPackage: string | null;
            interventionType: string;
            overrideAt: Date | null;
            overrideReason: string | null;
            initiatedAt: Date;
            initiatorId: string;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    handleConsentRevocation(userId: string, circleId: string): Promise<{
        cancelledCount: number;
    }>;
    transitionInterventions(): Promise<void>;
}
