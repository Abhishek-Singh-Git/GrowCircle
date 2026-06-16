import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AuthRateLimiterGuard implements CanActivate {
    private static ipHits;
    canActivate(context: ExecutionContext): boolean;
}
