export declare class UploadsService {
    private s3Client;
    private readonly logger;
    constructor();
    processAndUploadImage(file: Express.Multer.File, userId: string): Promise<{
        url: string;
        thumbnailUrl: string;
    }>;
}
