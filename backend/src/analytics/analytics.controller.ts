import {Body,Controller,Get,HttpCode,Inject,Post,Req,UseGuards} from '@nestjs/common';
import type {Request} from 'express';
import {AuthService,digest,fail} from '../auth/auth.service';
import {AdminGuard} from '../auth/admin.guard';
import {DatabaseService} from '../database/database.service';
export function eventKey(visitor:string,type:string,postId:string,date:string){return digest(JSON.stringify([visitor,type,postId,type==='view'?date.slice(0,10):'once']));}
@Controller()
export class AnalyticsController{
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService,@Inject(AuthService) private readonly auth:AuthService){}
  @Post('events') @HttpCode(200) async event(@Req() req:Request,@Body() p:any){
    this.auth.origin(req);if(!p||typeof p.visitor!=='string'||p.visitor.length>80||!['view','like'].includes(p.type)||typeof p.postId!=='string')fail('validationError');
    if(p.postId!=='home'&&!await this.db.posts.existsBy({id:p.postId,published:true}))return {ok:true};const date=new Date().toISOString();
    await this.db.events.createQueryBuilder().insert().values({key:eventKey(p.visitor,p.type,p.postId,date),visitor:p.visitor,type:p.type,postId:p.postId,date}).orIgnore().execute();return {ok:true};
  }
  @Get('stats') @UseGuards(AdminGuard) async stats(){
    const [views,likes,users,posts,counts]=await Promise.all([this.db.events.countBy({type:'view'}),this.db.events.countBy({type:'like'}),this.db.events.createQueryBuilder('e').select('COUNT(DISTINCT e.visitor)','count').getRawOne(),this.db.posts.find(),this.db.events.createQueryBuilder('e').select('e.postId','postId').addSelect('COUNT(*)','count').where('e.type = :type',{type:'view'}).groupBy('e.postId').getRawMany()]);
    const start=new Date();start.setUTCDate(start.getUTCDate()-13);const recent=await this.db.events.createQueryBuilder('e').where('e.date >= :date',{date:start.toISOString().slice(0,10)}).getMany();
    const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-13+i);const date=d.toISOString().slice(0,10),events=recent.filter(e=>e.date.startsWith(date));return {date:date.slice(5),views:events.filter(e=>e.type==='view').length,likes:events.filter(e=>e.type==='like').length};});
    return {views,likes,users:Number(users.count),days,posts:posts.map(p=>({id:p.id,title:p.title,country:p.country,views:Number(counts.find(c=>c.postId===p.id)?.count||0)}))};
  }
}
