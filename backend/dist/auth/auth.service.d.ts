import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            [x: string]: unknown;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            [x: string]: unknown;
        };
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    private generateTokenPair;
    private hashToken;
    private sanitizeUser;
    validateUser(userId: string): Promise<{
        name: string;
        email: string | null;
        phone: string | null;
        id: string;
        avatarUrl: string | null;
        timezone: string;
        plan: string;
    } | null>;
}
