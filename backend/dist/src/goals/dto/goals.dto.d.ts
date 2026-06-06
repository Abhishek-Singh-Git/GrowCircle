export declare class CreateGoalDto {
    circleId: string;
    name: string;
    goalType: string;
    targetValue?: number;
    targetUnit?: string;
    scheduleType: string;
    scheduleDays?: number[];
    scheduleWeeklyFreq?: number;
    scheduleStartDate?: string;
    scheduleEndDate?: string;
    category?: string;
    categoryEmoji?: string;
    difficultyWeight?: number;
    requireProof?: boolean;
    isSensitive?: boolean;
}
export declare class UpdateGoalDto {
    name?: string;
    targetValue?: number;
    targetUnit?: string;
    category?: string;
    categoryEmoji?: string;
    difficultyWeight?: number;
    requireProof?: boolean;
    isSensitive?: boolean;
}
