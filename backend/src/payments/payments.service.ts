import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
    const paymentUrl = `${frontendUrl}/pay/${payment.id}`;

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
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerName: true,
        email: true,
        phone: true,
        amount: true,
        description: true,
        status: true,
        paymentUrl: true,
        createdAt: true,
      },
    });
  }

  async getPublicPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        customerName: true,
        amount: true,
        description: true,
        status: true,
        expiresAt: true,
        paidAt: true,
        merchant: { select: { name: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('This payment link is invalid or no longer available.');
    }

    if (payment.expiresAt && payment.expiresAt <= new Date()) {
      if (payment.status === 'PENDING') {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'EXPIRED' },
        });
      }
      return {
        id: payment.id,
        customerName: payment.customerName,
        amount: payment.amount,
        description: payment.description,
        status: 'EXPIRED' as const,
        expiresAt: payment.expiresAt,
        paidAt: payment.paidAt,
        merchantName: payment.merchant.name,
      };
    }

    return {
      id: payment.id,
      customerName: payment.customerName,
      amount: payment.amount,
      description: payment.description,
      status: payment.status,
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt,
      merchantName: payment.merchant.name,
    };
  }

  async completePublicPayment(paymentId: string) {
    const payment = await this.getPublicPayment(paymentId);

    if (payment.status === 'EXPIRED') {
      throw new GoneException('This payment link has expired.');
    }
    if (payment.status === 'SUCCESS') {
      throw new ConflictException('This payment has already been completed.');
    }
    if (payment.status !== 'PENDING') {
      throw new ConflictException('This payment link is no longer payable.');
    }

    const completedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCESS', paidAt: new Date() },
      select: { id: true, status: true, paidAt: true },
    });

    return completedPayment;
  }
}
