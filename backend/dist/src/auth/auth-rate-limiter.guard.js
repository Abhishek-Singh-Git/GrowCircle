"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AuthRateLimiterGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRateLimiterGuard = void 0;
const common_1 = require("@nestjs/common");
let AuthRateLimiterGuard = class AuthRateLimiterGuard {
    static { AuthRateLimiterGuard_1 = this; }
    static ipHits = new Map();
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const ip = request.headers['x-forwarded-for'] ||
            request.ip ||
            request.socket.remoteAddress ||
            'unknown';
        const now = Date.now();
        const windowMs = 15 * 60 * 1000;
        const maxRequests = 100;
        const hits = AuthRateLimiterGuard_1.ipHits.get(ip);
        if (!hits) {
            AuthRateLimiterGuard_1.ipHits.set(ip, {
                count: 1,
                resetTime: now + windowMs,
            });
            return true;
        }
        if (now > hits.resetTime) {
            AuthRateLimiterGuard_1.ipHits.set(ip, {
                count: 1,
                resetTime: now + windowMs,
            });
            return true;
        }
        if (hits.count >= maxRequests) {
            throw new common_1.HttpException('Too many requests from this IP, please try again after 15 minutes', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        hits.count++;
        return true;
    }
};
exports.AuthRateLimiterGuard = AuthRateLimiterGuard;
exports.AuthRateLimiterGuard = AuthRateLimiterGuard = AuthRateLimiterGuard_1 = __decorate([
    (0, common_1.Injectable)()
], AuthRateLimiterGuard);
//# sourceMappingURL=auth-rate-limiter.guard.js.map