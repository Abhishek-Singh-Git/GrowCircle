"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    try {
        console.log('Starting NestJS application...');
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        if (process.env.FIREBASE_ADMIN_SDK) {
            try {
                const admin = await import('firebase-admin');
                const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log('Firebase Admin SDK initialized successfully');
            }
            catch (e) {
                console.error('Failed to initialize Firebase Admin:', e);
            }
        }
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        app.enableCors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        });
        const port = process.env.PORT || 3001;
        await app.listen(port, '0.0.0.0');
        console.log(`🚀 GrowCircle API running on http://0.0.0.0:${port}`);
    }
    catch (err) {
        console.error('❌ FATAL: NestJS failed to start:', err);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map