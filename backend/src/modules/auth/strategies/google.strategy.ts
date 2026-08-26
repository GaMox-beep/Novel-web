import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  Profile,
  VerifyCallback,
  StrategyOptions,
} from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly authService: AuthService) {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientID || !clientSecret) {
      Logger.warn(
        'GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa được cấu hình. Google OAuth sẽ không hoạt động.',
        GoogleStrategy.name,
      );
    }

    const options: StrategyOptions = {
      clientID: clientID || 'not-configured',
      clientSecret: clientSecret || 'not-configured',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    };
    super(options);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return done(
          new Error(
            'Google OAuth chưa được cấu hình biến môi trường trên server',
          ),
        );
      }

      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('Google không cung cấp email'));
      }

      const result = await this.authService.googleOAuth({
        providerId: profile.id,
        email,
        emailVerified: Boolean(profile._json?.email_verified),
        displayName: profile.displayName ?? null,
        avatar: profile.photos?.[0]?.value ?? null,
      });

      return done(null, result);
    } catch (error) {
      return done(error as Error);
    }
  }
}
