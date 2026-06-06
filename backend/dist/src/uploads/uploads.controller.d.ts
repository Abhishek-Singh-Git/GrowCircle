import { UploadsService } from './uploads.service';
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    uploadImage(file: any, req: any): Promise<{
        url: string;
        thumbnailUrl: string;
    }>;
}
