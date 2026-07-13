import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateRefundDto {
  /** How much of the original payment to refund, as a percentage (0–100]. */
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'percentage must be a number with at most two decimal places.' },
  )
  @IsPositive({ message: 'percentage must be greater than zero.' })
  @Max(100, { message: 'percentage cannot exceed 100.' })
  percentage!: number;

  @IsOptional()
  @IsString({ message: 'reason must be text.' })
  @MaxLength(300, { message: 'reason cannot exceed 300 characters.' })
  reason?: string;
}
