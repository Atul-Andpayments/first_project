import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/CreatePaymentDto';

@Injectable()
export class PaymentsService {

  constructor(
    private prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePaymentDto,
    merchantId: string,
  ) {

    const payment = await this.prisma.payment.create({

      data: {

        merchantId,

        customerName: dto.customerName,

        email: dto.email,

        phone: dto.phone,

        amount: dto.amount,

        description: dto.description,

      },

    });

    const paymentUrl =
      `http://localhost:5173/pay/${payment.id}`;

    await this.prisma.payment.update({

      where: {
        id: payment.id,
      },

      data: {
        paymentUrl,
      },

    });

    return {

      paymentId: payment.id,

      paymentUrl,

      status: payment.status,

    };
  }
  async getAllPayments(merchantId: string) {
    return this.prisma.payment.findMany({
      where: {
        merchantId,
      },
    });
  }
}