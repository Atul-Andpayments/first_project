import { Module } from '@nestjs/common';
import {
  PaymentsController,
  PublicPaymentsController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, PublicPaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
