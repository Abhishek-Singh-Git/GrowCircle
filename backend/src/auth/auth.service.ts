import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB);
  }

  // ── REGISTER ──────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone number is required');
    }

    // Check for existing user
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Account already exists. Try logging in.');
    }

    // Hash password (bcrypt cost factor >= 12 per PRD Section 25)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        passwordHash,
        timezone: dto.timezone || 'UTC',
      },
    });

    // Create default preferences
    await this.prisma.userPreference.create({
      data: { userId: user.id },
    });

    // Generate token pair
    const tokens = await this.generateTokenPair(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ── GOOGLE LOGIN ─────────────────────────────────────────────────────
  async loginWithGoogle(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: [
          process.env.GOOGLE_CLIENT_ID_WEB,
          process.env.GOOGLE_CLIENT_ID_ANDROID,
        ].filter(Boolean) as string[],
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      // Find or create user
      let user = await this.prisma.user.findFirst({
        where: { email: payload.email },
      });

      if (!user) {
        // Google OAuth users don't use password auth — generate a random hash as placeholder
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const placeholderHash = await bcrypt.hash(randomPassword, 12);
        user = await this.prisma.user.create({
          data: {
            email: payload.email,
            name: payload.name || 'New User',
            avatarUrl: payload.picture,
            passwordHash: placeholderHash,
          },
        });
        
        // Create default preferences
        await this.prisma.userPreference.create({
          data: { userId: user.id },
        });
      }

      // Generate token pair
      const tokens = await this.generateTokenPair(user.id);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    if (dto.idToken) {
      return this.loginWithGoogle(dto.idToken);
    }

    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.credential },
          { phone: dto.credential },
        ],
        accountStatus: 'active',
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!dto.password) {
      throw new UnauthorizedException('Password is required');
    }

    // Verify password
    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last active
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Generate token pair
    const tokens = await this.generateTokenPair(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ── REFRESH TOKEN ─────────────────────────────────────────────────────
  async refreshToken(refreshToken: string) {
    // Hash the incoming token to compare with stored hash
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
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Delete the consumed token to prevent database bloat
    await this.prisma.authToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new token pair
    return this.generateTokenPair(storedToken.userId);
  }

  // ── LOGOUT ────────────────────────────────────────────────────────────
  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.authToken.updateMany({
      where: { tokenHash, tokenType: 'refresh' },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  // ── TOKEN GENERATION ──────────────────────────────────────────────────
  private async generateTokenPair(userId: string) {
    // Access token: 15-minute expiry (PRD Section 25)
    const accessToken = this.jwtService.sign(
      { sub: userId },
      { expiresIn: 900 },
    );

    // Refresh token: 30-day expiry, single-use with rotation
    const rawRefreshToken = uuidv4();
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

  // ── HELPERS ───────────────────────────────────────────────────────────
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  // ── VALIDATE USER (for JWT Strategy) ──────────────────────────────────
  async validateUser(userId: string) {
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
}
