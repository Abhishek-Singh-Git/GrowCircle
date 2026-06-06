export declare class CreateLogDto {
    clientUuid: string;
    goalInstanceId: string;
    actualValue?: number;
    completionFraction?: number;
    status: string;
    notes?: string;
    proofUrl?: string;
    proofType?: string;
}
export declare class CreateReactionDto {
    emoji: string;
}
