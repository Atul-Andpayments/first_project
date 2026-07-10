import { Controller,Body,Post,Res,Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import {LoginDto} from './dto/login.dto';
import { PassThrough } from 'stream';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService:AuthService){}

    @Post('signup')
    signup(@Body() dto:SignupDto){
        return this.authService.signup(dto);
    }

    @Post('login')
    login(
        @Body() dto:LoginDto,
        @Res({passthrough:true}) res:Response,
    ){
        return this.authService.login(dto,res);
    }

    @Post('logout')
    logout(@Res({ passthrough: true }) res: Response) {
        return this.authService.logout(res);
    }
    
}
