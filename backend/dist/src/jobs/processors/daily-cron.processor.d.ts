import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from '../../goals/goals.service';
import { ChallengesService } from '../../challenges/challenges.service';
export declare class DailyCronProcessor extends WorkerHost {
    private readonly prisma;
    private readonly goalsService;
    private readonly challengesService;
    private readonly logger;
    constructor(prisma: PrismaService, goalsService: GoalsService, challengesService: ChallengesService);
    process(job: Job<any, any, string>): Promise<any>;
    private handleHourlyCron;
}
