import { Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly authService;
    constructor(authService: AuthService);
    validate(payload: {
        sub: string;
    }): Promise<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        avatarUrl: string | null;
        timezone: string;
        plan: string;
    }>;
}
export {};
