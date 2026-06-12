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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const admin = __importStar(require("firebase-admin"));
async function bootstrap() {
    try {
        console.log('Starting NestJS application...');
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        if (!admin.apps.length) {
            try {
                let certData;
                try {
                    certData = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
                }
                catch (parseError) {
                    console.error('❌ CRITICAL: FIREBASE_ADMIN_SDK is missing or invalid JSON. Firebase features will fail.');
                }
                if (certData) {
                    admin.initializeApp({
                        credential: admin.credential.cert(certData),
                    });
                }
            }
            catch (error) {
                if (!/already exists/i.test(error.message)) {
                    throw error;
                }
                console.log('ℹ️ Firebase Admin already initialized, reusing existing app.');
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