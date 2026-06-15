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
}
