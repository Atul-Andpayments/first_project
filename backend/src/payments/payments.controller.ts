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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {

  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  createPayment(
    @Body() dto: CreatePaymentDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.paymentsService.create(dto, req.user.id);
  }

  // Kept as an alias so clients using /payments/create receive the same API.
  @Post('create')
  createPaymentAtCreatePath(
    @Body() dto: CreatePaymentDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.paymentsService.create(dto, req.user.id);
  }

  @Get('all')
  getAllPayments(@Req() req: { user: { id: string } }) {
    return this.paymentsService.getAllPayments(req.user.id);
  }
}

/**
 * Customer-facing payment-link API. It deliberately has no JWT guard because
 * a customer opens this endpoint from a link sent by the merchant.
 */
@Controller('public/payments')
export class PublicPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':paymentId')
  getPaymentLink(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPublicPayment(paymentId);
  }

  /**
   * Demo checkout completion. Replace this with a verified payment-gateway
   * webhook before accepting real money.
   */
  @Post(':paymentId/complete')
  completePayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.completePublicPayment(paymentId);
  }
}
