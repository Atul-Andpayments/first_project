import { Controller, Get, UseGuards, Post, Req } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import {JwtAuthGuard} from 'src/auth/guards/jwt-auth.guard'
import { UnauthorizedException } from '@nestjs/common';

@Controller('merchant')
export class MerchantController {
    constructor(private readonly merchantService:MerchantService){}

    
    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Req() req){
        return this.merchantService.getProfile(req.user.id);
    }
    // @Get('test401')
    // test401() {
    //     throw new UnauthorizedException('Testing');
    // }

}
