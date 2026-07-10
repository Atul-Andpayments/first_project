import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MerchantService {
    constructor(
         private readonly prisma:PrismaService,
    ){}
  async getProfile(merchantId: string) {

    const merchant = await this.prisma.merchant.findUnique({
      where: {
        id: merchantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    //if(!merchant)
    return merchant;
  }
}
