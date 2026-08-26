import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { GoogleAuthResult } from './dto/google-auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  // Google OAuth — begin: redirects the browser to Google's consent screen.
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleRedirect() {
    // Passport handles the redirect to Google; this never returns.
  }

  // Google OAuth — callback: exchanges the code, then redirects the browser
  // back to the frontend with the session tokens as query parameters.
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = req.user as GoogleAuthResult;
    const frontendUrl = (
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ).replace(/\/$/, '');

    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: JSON.stringify(result.user),
    });

    res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
  }
}
