import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
@Injectable()
export class AuthService {
    constructor(
        private readonly prisma:PrismaService,
        private readonly jwtService:JwtService,
    ){}
    async signup(dto: SignupDto){
       const name = dto.name.trim();
       const email = dto.email.trim().toLowerCase();
       const phone = dto.phone.trim();
       const {password} = dto;

       const existingEmail = await this.prisma.merchant.findUnique({
        where:{
            email,
        },
       });
       if(existingEmail){
        throw new ConflictException('Email already exists');
       }
       const existingPhone = await this.prisma.merchant.findUnique({
        where:{
            phone,
        }
       });
       if(existingPhone){
        throw new ConflictException('Phone number already exists');
       }
       const hashedPassword = await bcrypt.hash(password,10);
       const merchant = await this.prisma.merchant.create({
        data:{
            name,
            email,
            password:hashedPassword,
            phone,
        },
        select:{
            id:true,
            name:true,
            email:true,
            phone:true,
            createdAt:true,
        },
       });
       return {
        message:'Merchant registered successfully',
        merchant,
       };
    }
    async login(dto:LoginDto, res:Response){
        const email = dto.email.trim().toLowerCase();
        const {password} = dto;
        const merchant = await this.prisma.merchant.findUnique({
            where:{
                email,
            }
        });
        if(!merchant){
            throw new UnauthorizedException('Invalid email or password');
        }
        const isMatch = await bcrypt.compare(
            password,
            merchant.password
        )
        if(!isMatch){
            throw new UnauthorizedException("Invalid email or password");
        }
        const payload = {
            sub:merchant.id,
            email:merchant.email,
        };
        const accessToken = this.jwtService.sign(payload);
        res.cookie('accessToken',accessToken,{
            httpOnly:true,
            secure:false,
            sameSite:'lax',
            maxAge: 15*60*1000,
        });
        return {
            message:'Login successful',
        };
    }
    async logout(res:Response){
        res.clearCookie('accessToken',{
            httpOnly:true,
            secure:false,
            sameSite:'lax',
        });
        return {
            message:'Logged out successfully',
        };
    }
}
