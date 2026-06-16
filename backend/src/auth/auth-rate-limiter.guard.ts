import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class AuthRateLimiterGuard implements CanActivate {
  private static ipHits = new Map<string, { count: number; resetTime: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Trust proxy headers if behind standard reverse proxies
    const ip =
      request.headers['x-forwarded-for'] ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes window
    const maxRequests = 100; // Max 100 requests per 15 minutes

    const hits = AuthRateLimiterGuard.ipHits.get(ip);

    if (!hits) {
      AuthRateLimiterGuard.ipHits.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (now > hits.resetTime) {
      AuthRateLimiterGuard.ipHits.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (hits.count >= maxRequests) {
      throw new HttpException(
        'Too many requests from this IP, please try again after 15 minutes',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    hits.count++;
    return true;
  }
}
