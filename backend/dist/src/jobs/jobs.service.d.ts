import { OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
export declare class JobsService implements OnModuleInit {
    private readonly dailyCronQueue;
    private readonly logger;
    constructor(dailyCronQueue: Queue);
    onModuleInit(): Promise<void>;
}
