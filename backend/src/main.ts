import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';

async function bootstrap() {
  try {
    console.log('Starting NestJS application...');
    const app = await NestFactory.create(AppModule);

    // Prevent duplicate initialization
    if (!admin.apps.length) {
      try {
        let certData;
        try {
          certData = JSON.parse(process.env.FIREBASE_ADMIN_SDK as string);
        } catch (parseError) {
          console.error('❌ CRITICAL: FIREBASE_ADMIN_SDK is missing or invalid JSON. Firebase features will fail.');
        }

        if (certData) {
          admin.initializeApp({
            credential: admin.credential.cert(certData),
          });
        }
      } catch (error: any) {
        if (!/already exists/i.test(error.message)) {
          throw error;
        }
        console.log('ℹ️ Firebase Admin already initialized, reusing existing app.');
      }
    }

    // Global validation pipe for DTO validation (class-validator)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,       // Strip properties not in DTO
        forbidNonWhitelisted: true, // Throw on unexpected properties
        transform: true,       // Auto-transform payloads to DTO instances
      }),
    );

    // CORS for mobile app
    app.enableCors({
      origin: '*', // Restrict in production
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 GrowCircle API running on http://0.0.0.0:${port}`);
  } catch (err) {
    console.error('❌ FATAL: NestJS failed to start:', err);
    process.exit(1);
  }
}
bootstrap();

