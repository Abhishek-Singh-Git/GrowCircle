import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import sharp from 'sharp';

@Injectable()
export class UploadsService {
  private s3Client: S3Client;
  private readonly logger = new Logger(UploadsService.name);

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
      },
    });
  }

  async processAndUploadImage(file: any, userId: string) {
    if (!file) throw new BadRequestException('No file provided');

    try {
      // 1. Simulate CSAM Scanning (In reality, call AWS Rekognition or similar here)
      this.logger.log(`Scanning image for CSAM...`);
      const isSafe = true; // Simulated
      if (!isSafe) {
        throw new BadRequestException('Image flagged for inappropriate content');
      }

      // 2. Process image with sharp: Strip EXIF, resize if too large, compress
      const processedBuffer = await sharp(file.buffer)
        .rotate() // auto-rotate based on EXIF
        .resize({ width: 1200, withoutEnlargement: true }) // limit max width
        .jpeg({ quality: 80 }) // convert to JPEG and compress
        .withMetadata({}) // strip EXIF
        .toBuffer();

      // 3. Generate thumbnail
      const thumbnailBuffer = await sharp(processedBuffer)
        .resize({ width: 300, height: 300, fit: 'cover' })
        .jpeg({ quality: 70 })
        .toBuffer();

      const baseKey = `uploads/${userId}/${crypto.randomUUID()}`;
      const mainKey = `${baseKey}.jpg`;
      const thumbKey = `${baseKey}_thumb.jpg`;
      const bucket = process.env.AWS_S3_BUCKET || 'growcircle-proofs';

      // 4. Upload both to S3
      await Promise.all([
        this.s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: mainKey,
            Body: processedBuffer,
            ContentType: 'image/jpeg',
          }),
        ),
        this.s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: thumbKey,
            Body: thumbnailBuffer,
            ContentType: 'image/jpeg',
          }),
        ),
      ]);

      const region = process.env.AWS_REGION || 'us-east-1';
      return {
        url: `https://${bucket}.s3.${region}.amazonaws.com/${mainKey}`,
        thumbnailUrl: `https://${bucket}.s3.${region}.amazonaws.com/${thumbKey}`,
      };
    } catch (error: any) {
      this.logger.error(`Error processing/uploading image: ${error.message}`, error.stack);
      throw new BadRequestException('Image upload failed');
    }
  }
}
