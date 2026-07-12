import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsPositive,
  Max,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreatePaymentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'customerName must be text.' })
  @IsNotEmpty({ message: 'customerName is required.' })
  @MaxLength(100, { message: 'customerName cannot exceed 100 characters.' })
  customerName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @ValidateIf((payment: CreatePaymentDto) =>
    payment.email !== undefined || payment.phone === undefined,
  )
  @IsEmail({}, {
    message:
      'Provide a valid email address or a valid 10-digit Indian mobile number.',
  })
  email?: string;

  @ValidateIf((payment: CreatePaymentDto) => payment.phone !== undefined)
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Please enter a valid 10-digit Indian mobile number',
  })
  phone?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount must be a number with at most two decimal places.' })
  @IsPositive({ message: 'amount must be greater than zero.' })
  @Max(10_000_000, { message: 'amount cannot exceed 10,000,000.' })
  amount!: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'description must be text.' })
  @MaxLength(500, { message: 'description cannot exceed 500 characters.' })
  description?: string;
}
