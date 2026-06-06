import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('Starting NestJS application...');
    const app = await NestFactory.create(AppModule);

    // Initialize Firebase Admin only if configured
    if (process.env.FIREBASE_ADMIN_SDK) {
      try {
        const admin = await import('firebase-admin');
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
    console.log(`🚀 GrowCircle API running on http://0.0.0.0:${port}`);
  } catch (err) {
    console.error('❌ FATAL: NestJS failed to start:', err);
    process.exit(1);
  }
}
bootstrap();

