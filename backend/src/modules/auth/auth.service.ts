import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './services/token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleProfileDto, GoogleAuthResult } from './dto/google-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Đăng ký tài khoản người dùng mới
   */
  async register(dto: RegisterDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new BadRequestException('Email đã tồn tại trong hệ thống');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new BadRequestException('Tên người dùng đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
      },
    });

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    return {
      message: 'Đăng ký tài khoản thành công',
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

  /**
   * Đăng nhập bằng Email & Mật khẩu
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    return {
      message: 'Đăng nhập thành công',
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

  /**
   * Đăng xuất và thu hồi Refresh Token
   */
  async logout(userId: string) {
    await this.tokenService.revokeTokensForUser(userId);

    return {
      message: 'Đăng xuất thành công',
    };
  }

  /**
   * Làm mới Access Token bằng Refresh Token (Token Rotation)
   */
  async refreshToken(dto: RefreshTokenDto) {
    const result = await this.tokenService.refreshTokens(dto.refreshToken);

    return {
      message: 'Làm mới token thành công',
      ...result,
    };
  }

  /**
   * Xác thực và đăng nhập qua Google OAuth
   */
  async googleOAuth(profile: GoogleProfileDto): Promise<GoogleAuthResult> {
    const existing = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: 'google',
          providerId: profile.providerId,
        },
      },
      include: { user: true },
    });

    if (existing) {
      const user = existing.user;
      return this.buildAuthResult(
        user.id,
        user.email,
        user.username,
        user.role,
        user.avatar,
        user.coins,
      );
    }

    const userByEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (userByEmail) {
      if (!profile.emailVerified) {
        throw new UnauthorizedException('Email chưa được xác thực bởi Google');
      }
      await this.linkOAuthIdentity(userByEmail.id, profile);
      return this.buildAuthResult(
        userByEmail.id,
        userByEmail.email,
        userByEmail.username,
        userByEmail.role,
        userByEmail.avatar,
        userByEmail.coins,
      );
    }

    const username = await this.generateUniqueUsername(
      profile.email,
      profile.displayName,
    );
    const newUser = await this.prisma.user.create({
      data: {
        email: profile.email,
        username,
        password: null,
        avatar: profile.avatar ?? null,
      },
    });

    await this.linkOAuthIdentity(newUser.id, profile);
    return this.buildAuthResult(
      newUser.id,
      newUser.email,
      newUser.username,
      newUser.role,
      newUser.avatar,
      newUser.coins,
    );
  }

  private async linkOAuthIdentity(userId: string, profile: GoogleProfileDto) {
    await this.prisma.oAuthAccount.create({
      data: {
        provider: 'google',
        providerId: profile.providerId,
        email: profile.email,
        userId,
      },
    });
  }

  private async generateUniqueUsername(
    email: string,
    displayName?: string | null,
  ): Promise<string> {
    const localPart =
      email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_.-]/g, '')
        .slice(0, 20) || 'user';
    const base = displayName
      ? displayName.trim().replace(/\s+/g, '').slice(0, 20) || localPart
      : localPart;

    let candidate = base;
    let suffix = 1;

    while (true) {
      const exists = await this.prisma.user.findUnique({
        where: { username: candidate },
      });
      if (!exists) return candidate;
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
  }

  private async buildAuthResult(
    id: string,
    email: string,
    username: string,
    role: string,
    avatar: string | null,
    coins: number,
  ): Promise<GoogleAuthResult> {
    const tokens = await this.tokenService.generateTokens(id, email, role);
    return {
      user: { id, email, username, role, avatar, coins },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
