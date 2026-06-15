import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from '../../goals/goals.service';
import { ChallengesService } from '../../challenges/challenges.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InterventionsService } from '../../interventions/interventions.service';
export declare class DailyCronProcessor extends WorkerHost {
    private readonly prisma;
    private readonly goalsService;
    private readonly challengesService;
    private readonly eventEmitter;
    private readonly interventionsService;
    private readonly logger;
    constructor(prisma: PrismaService, goalsService: GoalsService, challengesService: ChallengesService, eventEmitter: EventEmitter2, interventionsService: InterventionsService);
    process(job: Job<any, any, string>): Promise<any>;
    private handleTransitionInterventions;
    private handleLateNightCheck;
    private handleHourlyCron;
}
