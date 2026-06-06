import { InterventionsService } from './interventions.service';
import { CreateInterventionDto, OverrideInterventionDto } from './dto/interventions.dto';
export declare class InterventionsController {
    private readonly interventionsService;
    constructor(interventionsService: InterventionsService);
    createIntervention(req: {
        user: {
            id: string;
        };
    }, dto: CreateInterventionDto): Promise<{
        initiator: {
            name: string;
            id: string;
            avatarUrl: string | null;
        };
        target: {
            name: string;
            id: string;
        };
    } & {
        id: string;
        expiresAt: Date | null;
        status: string;
        circleId: string;
        appPackage: string | null;
        durationSeconds: number | null;
        targetId: string;
        interventionType: string;
        overrideAt: Date | null;
        overrideReason: string | null;
        initiatedAt: Date;
        initiatorId: string;
    }>;
    overrideIntervention(req: {
        user: {
            id: string;
        };
    }, interventionId: string, dto: OverrideInterventionDto): Promise<{
        overriddenAt: Date | null;
    }>;
    getInterventions(req: {
        user: {
            id: string;
        };
    }, circleId: string, dateFrom?: string, dateTo?: string, page?: string, limit?: string): Promise<{
        items: ({
            initiator: {
                name: string;
                id: string;
                avatarUrl: string | null;
            };
            target: {
                name: string;
                id: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            expiresAt: Date | null;
            status: string;
            circleId: string;
            appPackage: string | null;
            durationSeconds: number | null;
            targetId: string;
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
}
