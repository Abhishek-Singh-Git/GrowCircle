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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const uuid_1 = require("uuid");
const crypto = __importStar(require("crypto"));
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(dto) {
        if (!dto.email && !dto.phone) {
            throw new common_1.BadRequestException('Email or phone number is required');
        }
        const existing = await this.prisma.user.findFirst({
            where: {
                OR: [
                    ...(dto.email ? [{ email: dto.email }] : []),
                    ...(dto.phone ? [{ phone: dto.phone }] : []),
                ],
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Account already exists. Try logging in.');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email || null,
                phone: dto.phone || null,
                passwordHash,
            },
        });
        await this.prisma.userPreference.create({
            data: { userId: user.id },
        });
        const tokens = await this.generateTokenPair(user.id);
        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.credential },
                    { phone: dto.credential },
                ],
                accountStatus: 'active',
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
        });
        const tokens = await this.generateTokenPair(user.id);
        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }
    async refreshToken(refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        const storedToken = await this.prisma.authToken.findFirst({
            where: {
                tokenHash,
                tokenType: 'refresh',
                revokedAt: null,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
        if (!storedToken) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        await this.prisma.authToken.update({
            where: { id: storedToken.id },
            data: { usedAt: new Date() },
        });
        return this.generateTokenPair(storedToken.userId);
    }
    async logout(refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        await this.prisma.authToken.updateMany({
            where: { tokenHash, tokenType: 'refresh' },
            data: { revokedAt: new Date() },
        });
        return { success: true };
    }
    async generateTokenPair(userId) {
        const accessToken = this.jwtService.sign({ sub: userId }, { expiresIn: 900 });
        const rawRefreshToken = (0, uuid_1.v4)();
        const tokenHash = this.hashToken(rawRefreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await this.prisma.authToken.create({
            data: {
                userId,
                tokenHash,
                tokenType: 'refresh',
                expiresAt,
            },
        });
        return {
            accessToken,
            refreshToken: rawRefreshToken,
        };
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    sanitizeUser(user) {
        const { passwordHash, ...safe } = user;
        return safe;
    }
    async validateUser(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId, accountStatus: 'active' },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
                timezone: true,
                plan: true,
            },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map