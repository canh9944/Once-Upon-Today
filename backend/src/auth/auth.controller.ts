import {Body,Controller,Delete,Get,Header,HttpCode,Inject,Post,Req,Res} from '@nestjs/common';
import type {Request,Response} from 'express';
import {AuthService,configured} from './auth.service';
@Controller('auth')
export class AuthController{
  constructor(@Inject(AuthService) private readonly auth:AuthService){}
  @Get() @Header('Cache-Control','private, no-store') async current(@Req() req:Request){const user=await this.auth.current(req);return {authenticated:!!user,user,googleEnabled:!!(configured()&&process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.APP_URL)};}
  @Post() @HttpCode(200) login(@Req() req:Request,@Res({passthrough:true}) res:Response,@Body() body:unknown){return this.auth.login(req,res,body);}
  @Post('signup') signup(@Req() req:Request,@Res({passthrough:true}) res:Response,@Body() body:unknown){return this.auth.signup(req,res,body);}
  @Delete() logout(@Req() req:Request,@Res({passthrough:true}) res:Response){return this.auth.logout(req,res);}
}
