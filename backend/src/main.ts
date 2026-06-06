import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Initialize Firebase Admin
  if (process.env.FIREBASE_ADMIN_SDK) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully');
    } catch (e) {
      console.error('Failed to initialize Firebase Admin:', e);
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
  console.log(`🚀 GrowCircle API running on http://localhost:${port}`);
}
bootstrap();
