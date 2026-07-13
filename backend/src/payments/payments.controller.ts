import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/CreatePaymentDto';
import { CreateRefundDto } from './dto/CreateRefundDto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {

  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('create')
  createPayment(
    @Body() dto: CreatePaymentDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.paymentsService.create(dto, req.user.id);
  }
  @Get('all')
  allPayments(
    @Req() req:{ user: { id: string } }
  ) {
    return this.paymentsService.getAllPayments(req.user.id);
  }

}

/**
 * Customer-facing mock payment portal — this is what the payment link
 * opens. No auth: the customer isn't a logged-in merchant.
 */
@Controller('public/payments')
export class PublicPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':paymentId')
  getPaymentLink(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPublicPayment(paymentId);
  }

  @Post(':paymentId/complete')
  completePayment(
    @Param('paymentId') paymentId: string,
    @Req() req: { user: { id: string ,status:string} },
    
  ) {
    return this.paymentsService.completePublicPayment(req, paymentId);
  }
}
