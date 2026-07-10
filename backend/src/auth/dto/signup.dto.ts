import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
export class SignupDto {
  @IsString({ message: 'Merchant name must be text' })
  @IsNotEmpty({ message: 'Merchant name is required' })
  @Matches(/^[A-Za-z0-9 .'-]{2,80}$/, {
    message: 'Merchant name must be between 2 and 80 valid characters',
  })
  name!: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString({ message: 'Password must be text' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  password!: string;

  @IsString({ message: 'Phone number must be text' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Please enter a valid 10-digit Indian mobile number',
  })
  phone!: string;
}
