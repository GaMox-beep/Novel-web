import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async generateTokens(userId: string, email: string, role: string) {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

    if (
      process.env.NODE_ENV === 'production' &&
      (!jwtSecret || !jwtRefreshSecret)
    ) {
      throw new InternalServerErrorException(
        'JWT Secrets are not configured in production environment',
      );
    }

    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtSecret || 'dev_secret_jwt_key_novel_2026',
      expiresIn: '1d',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtRefreshSecret || 'dev_secret_refresh_jwt_key_novel_2026',
      expiresIn: '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    const jwtRefreshSecret =
      process.env.JWT_REFRESH_SECRET || 'dev_secret_refresh_jwt_key_novel_2026';

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      tokenRecord.expiresAt < new Date() ||
      payload.sub !== tokenRecord.userId
    ) {
      if (tokenRecord) {
        await this.prisma.refreshToken.delete({
          where: { id: tokenRecord.id },
        });
      }
      throw new UnauthorizedException(
        'Refresh token không tồn tại hoặc đã hết hạn',
      );
    }

    // Token rotation: xóa refresh token cũ
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    const user = tokenRecord.user;
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        coins: user.coins,
      },
      ...tokens,
    };
  }

  async revokeTokensForUser(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
