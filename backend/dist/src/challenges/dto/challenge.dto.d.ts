export declare class CreateChallengeDto {
    circleId: string;
    title: string;
    conditionDescription: string;
    conditionType: string;
    conditionGoalId?: string;
    conditionTarget?: number;
    stakeType: string;
    stakeDescription?: string;
    stakePoints?: number;
    proofRequired: boolean;
    durationHours: number;
    participantIds: string[];
}
export declare class ResolveChallengeDto {
    winnerId?: string;
    outcomeType: string;
}
export declare class SubmitVictoryDto {
    proofText: string;
}
