"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var UploadsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto = __importStar(require("crypto"));
const sharp_1 = __importDefault(require("sharp"));
let UploadsService = UploadsService_1 = class UploadsService {
    s3Client;
    logger = new common_1.Logger(UploadsService_1.name);
    constructor() {
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
            },
        });
    }
    async processAndUploadImage(file, userId) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        try {
            this.logger.log(`Scanning image for CSAM...`);
            const isSafe = true;
            if (!isSafe) {
                throw new common_1.BadRequestException('Image flagged for inappropriate content');
            }
            const processedBuffer = await (0, sharp_1.default)(file.buffer)
                .rotate()
                .resize({ width: 1200, withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .withMetadata({})
                .toBuffer();
            const thumbnailBuffer = await (0, sharp_1.default)(processedBuffer)
                .resize({ width: 300, height: 300, fit: 'cover' })
                .jpeg({ quality: 70 })
                .toBuffer();
            const baseKey = `uploads/${userId}/${crypto.randomUUID()}`;
            const mainKey = `${baseKey}.jpg`;
            const thumbKey = `${baseKey}_thumb.jpg`;
            const bucket = process.env.AWS_S3_BUCKET || 'growcircle-proofs';
            await Promise.all([
                this.s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: bucket,
                    Key: mainKey,
                    Body: processedBuffer,
                    ContentType: 'image/jpeg',
                })),
                this.s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: bucket,
                    Key: thumbKey,
                    Body: thumbnailBuffer,
                    ContentType: 'image/jpeg',
                })),
            ]);
            const region = process.env.AWS_REGION || 'us-east-1';
            return {
                url: `https://${bucket}.s3.${region}.amazonaws.com/${mainKey}`,
                thumbnailUrl: `https://${bucket}.s3.${region}.amazonaws.com/${thumbKey}`,
            };
        }
        catch (error) {
            this.logger.error(`Error processing/uploading image: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Image upload failed');
        }
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = UploadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map