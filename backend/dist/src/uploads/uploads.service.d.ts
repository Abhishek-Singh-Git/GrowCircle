export declare class UploadsService {
    private s3Client;
    private readonly logger;
    constructor();
    processAndUploadImage(file: any, userId: string): Promise<{
        url: string;
        thumbnailUrl: string;
    }>;
}
