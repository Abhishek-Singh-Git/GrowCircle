import { IsEmail, IsOptional, IsString, MinLength, MaxLength, Matches, IsNotEmpty, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function AtLeastOne(fields: string[], validationOptions?: ValidationOptions) {
  return function (target: Function) {
    registerDecorator({
      name: 'atLeastOne',
      target: target,
      propertyName: '',
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          return fields.some((field) => obj[field] !== undefined && obj[field] !== null && obj[field] !== '');
        },
        defaultMessage(args: ValidationArguments) {
          return `At least one of the following fields must be provided: ${fields.join(', ')}`;
        },
      },
    });
  };
}

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

  @IsOptional()
  @IsString()
  timezone?: string;
}

@AtLeastOne(['credential', 'idToken'])
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

@AtLeastOne(['email', 'phone'])
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
