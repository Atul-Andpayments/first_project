import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/CreatePaymentDto';

// A payment link that's still PENDING this long after creation is treated
// as abandoned and auto-cancelled.
const PENDING_PAYMENT_TIMEOUT_MS = 2 * 60 * 1000;

@Injectable()
export class PaymentsService {

  constructor(
    private prisma: PrismaService,
  ) {}

  /** Cancels PENDING payments older than the timeout and persists it. */
  private async cancelStalePendingPayments(merchantId?: string) {
    const cutoff = new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MS);

    await this.prisma.payment.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
        ...(merchantId ? { merchantId } : {}),
      },
      data: { status: 'EXPIRED' },
    });
  }

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
    await this.cancelStalePendingPayments(merchantId);

    return this.prisma.payment.findMany({
      where: {
        merchantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /** Customer-facing lookup used by the mock payment portal (no auth). */
  async getPublicPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        customerName: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        paidAt: true,
        merchant: { select: { name: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException(
        'This payment link is invalid or no longer available.',
      );
    }

    const isStale =
      payment.status === 'PENDING' &&
      Date.now() - payment.createdAt.getTime() > PENDING_PAYMENT_TIMEOUT_MS;

    if (isStale) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'EXPIRED' },
      });
      return {
        ...payment,
        status: 'EXPIRED' as const,
        merchantName: payment.merchant.name,
      };
    }

    // if (payment.expiresAt && payment.expiresAt <= new Date()) {
    //   if (payment.status === 'PENDING') {
    //     await this.prisma.payment.update({
    //       where: { id: paymentId },
    //       data: { status: 'EXPIRED' },
    //     });
    //   }
    //   return {
    //     ...payment,
    //     status: 'EXPIRED' as const,
    //     merchantName: payment.merchant.name,
    //   };
    // }

    return { ...payment, merchantName: payment.merchant.name };
  }

  /** Mock "Pay now" completion — stands in for a real gateway webhook. */
  async completePublicPayment(req: { user: { id: string ,status:string} }, paymentId: string) {
    const status = req.user.status;
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

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCESS', paidAt: new Date() },
      select: { id: true, status: true, paidAt: true },
    });
  }
}