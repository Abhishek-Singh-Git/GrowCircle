export declare class RegisterDto {
    name: string;
    email?: string;
    phone?: string;
    password: string;
}
export declare class LoginDto {
    credential: string;
    password: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class ForgotPasswordDto {
    email?: string;
    phone?: string;
}
export declare class VerifyOtpDto {
    credential: string;
    otpCode: string;
}
export declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
