import {Body,Controller,Get,HttpCode,Inject,Post,Req,Res} from '@nestjs/common';
import type {Request,Response} from 'express';
import {randomUUID} from 'node:crypto';
import {AuthService,cookieOptions,equal,fail,normalizeEmail,validEmail} from './auth.service';
import {authorizationUrl,createFlow,googleConfig,googleIdentity,oauthCookie,readFlow} from './google-utils';
import {DatabaseService} from '../database/database.service';
import {UserEntity} from '../database/entities';
import {settings} from '../config';
import {isLocale} from '../../../shared/domain';
@Controller('auth/google')
export class GoogleController{
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService,@Inject(AuthService) private readonly auth:AuthService){}
  @Post() @HttpCode(200) async start(@Req() req:Request,@Res({passthrough:true}) res:Response,@Body() body:any){
    this.auth.origin(req);await this.auth.limit(req,'google',20);
    try{googleConfig();const {flow,cookie}=createFlow(isLocale(body?.locale)?body.locale:'en',body?.returnTo);res.cookie(oauthCookie,cookie,{...cookieOptions,maxAge:600000});return {url:authorizationUrl(flow)};}catch{fail('googleUnavailable',503);}
  }
  @Get('callback') async callback(@Req() req:Request,@Res() res:Response){
    const url=new URL(req.originalUrl,settings.origin),flow=readFlow(req.cookies?.[oauthCookie]),destination=new URL(flow?.returnTo||'/en',settings.origin);
    const reject=(code:string)=>{destination.searchParams.set('authError',code);res.clearCookie(oauthCookie,cookieOptions);res.redirect(307,destination.toString());};
    if(!flow||!url.searchParams.get('state')||!equal(url.searchParams.get('state')!,flow.state)||url.searchParams.has('error')||!url.searchParams.get('code'))return reject('oauthFailed');
    try{
      const identity=await googleIdentity(url.searchParams.get('code')!,flow);if(!validEmail(identity.email))return reject('oauthFailed');const email=normalizeEmail(identity.email);
      const id=await this.db.source.transaction(async manager=>{const repo=manager.getRepository(UserEntity),existing=await repo.findOneBy({googleSub:identity.sub}),collision=await repo.findOneBy({email});
        if(existing){if(collision&&collision.id!==existing.id)return null;await repo.update(existing.id,{email,name:identity.name.slice(0,80)});return existing.id;}
        if(collision)return null;const id=randomUUID();await repo.insert({id,email,name:identity.name.slice(0,80),googleSub:identity.sub,passwordHash:null,createdAt:new Date().toISOString()});return id;
      });
      if(!id)return reject('accountExists');await this.auth.session(req,res,id);res.clearCookie(oauthCookie,cookieOptions);res.redirect(307,destination.toString());
    }catch{return reject('oauthFailed');}
  }
}
