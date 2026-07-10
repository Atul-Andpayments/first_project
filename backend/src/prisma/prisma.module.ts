import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client/extension';

@Module({
  providers: [PrismaService],
  exports:[PrismaService],
})
export class PrismaModule {}
