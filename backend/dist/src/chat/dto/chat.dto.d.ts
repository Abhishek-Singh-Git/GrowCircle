export declare class CreateThreadDto {
    circleId: string;
    threadType: string;
    participantIds?: string[];
}
export declare class SendMessageDto {
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
}
