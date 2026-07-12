import {
  Body,
  Controller,
  Get,
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
