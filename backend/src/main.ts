import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'FIREBASE_ADMIN_SDK',
  'GOOGLE_CLIENT_ID_WEB',
  'GOOGLE_CLIENT_ID_ANDROID',
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ CRITICAL: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

async function bootstrap() {
  try {
    console.log('Starting NestJS application...');
    const app = await NestFactory.create(AppModule);

    // Prevent duplicate initialization
    if (!admin.apps.length) {
      const firebaseSdkJson = process.env.FIREBASE_ADMIN_SDK;
      if (!firebaseSdkJson) {
        console.error('❌ CRITICAL: FIREBASE_ADMIN_SDK environment variable is not set.');
        process.exit(1);
      }
      try {
        const certData = JSON.parse(firebaseSdkJson);
        admin.initializeApp({
          credential: admin.credential.cert(certData),
        });
      } catch (error: any) {
        if (!/already exists/i.test(error.message)) {
          console.error('❌ CRITICAL: FIREBASE_ADMIN_SDK is invalid JSON:', error.message);
          process.exit(1);
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
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'https://growcircle-production.up.railway.app',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:19006',
    ];

    app.enableCors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
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

