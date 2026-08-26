import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Allows unauthenticated requests to pass through with user = null instead of throwing 401
  override handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser,
  ): TUser | null {
    return user || null;
  }
}
