import { IsEmail, IsOptional, IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Password must contain at least 1 number and 1 special character',
  })
  password: string;
}

export class LoginDto {
  @IsString()
  @IsOptional()
  credential?: string; // email or phone

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  idToken?: string; // For Google OAuth
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class VerifyOtpDto {
  @IsString()
  credential: string;

  @IsString()
  otpCode: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
