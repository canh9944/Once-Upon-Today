import {Body,Controller,Delete,Get,Header,HttpCode,Inject,Param,Post,Query,Req,UseGuards} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import type {Request} from 'express';
import {AuthService,fail} from '../auth/auth.service';
import {AdminGuard} from '../auth/admin.guard';
import {DatabaseService} from '../database/database.service';
import {countries} from '../../../shared/data';
import {brand,isLocale} from '../../../shared/domain';
import {isImageSource,MAX_POST_CONTENT} from '../../../shared/content';
import {hasContent,sanitizeContent} from '../../../shared/sanitize-content';
@Controller()
export class PostsController{
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService,@Inject(AuthService) private readonly auth:AuthService){}
  @Get('posts') @Header('Cache-Control','private, no-store') async list(@Req() req:Request,@Query('language') language?:string,@Query('country') country?:string){
    if(language!==undefined&&!isLocale(language))fail('validationError');if(country!==undefined&&!countries.some(c=>c.code===country))fail('validationError');
    const query=this.db.posts.createQueryBuilder('p').orderBy('p.date','DESC').addOrderBy('p.rowid','ASC');
    if((await this.auth.current(req))?.role!=='admin')query.andWhere('p.published = :yes',{yes:true});if(language)query.andWhere('p.language = :language',{language});if(country)query.andWhere('p.country = :country',{country});return {posts:await query.getMany()};
  }
  @Get('posts/:id') @UseGuards(AdminGuard) @Header('Cache-Control','private, no-store') async edit(@Param('id') id:string){const post=await this.db.posts.findOneBy({id});if(!post)fail('notFound',404);return {post};}
  @Get('stories/:id') @Header('Cache-Control','no-store') async story(@Param('id') id:string){const post=await this.db.posts.findOneBy({id,published:true});if(!post)fail('notFound',404);return {post};}
  @Post('posts') @UseGuards(AdminGuard) @HttpCode(200) async save(@Body() p:any){
    if(!p||!['title','excerpt','category'].every(k=>typeof p[k]==='string'&&p[k].trim()&&p[k].length<1000)||typeof p.content!=='string'||!p.content.trim()||p.content.length>MAX_POST_CONTENT||!countries.some(c=>c.code===p.country)||!isLocale(p.language)||typeof p.published!=='boolean'||(p.contentFormat!==undefined&&!['text','html'].includes(p.contentFormat)))fail('validationError');
    const author=typeof p.author==='string'?p.author.trim()||brand:p.author===undefined?brand:null;if(!author||author.length>180)fail('validationError');if(p.image&&!isImageSource(p.image))fail('imageError');
    if(p.id!==undefined&&(typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)))fail('validationError');
    const content=p.contentFormat==='html'?sanitizeContent(p.content):p.content;if(p.contentFormat==='html'&&!hasContent(content))fail('validationError');
    const old=p.id?await this.db.posts.findOneBy({id:p.id}):null;
    const post={id:p.id||randomUUID(),title:p.title.trim(),excerpt:p.excerpt.trim(),content,contentFormat:p.contentFormat||'text',country:p.country,language:p.language,category:p.category,image:p.image||'',author,date:old?.date||new Date().toISOString().slice(0,10),published:p.published};
    await this.db.posts.upsert(post,['id']);return {post};
  }
  @Delete('posts') @UseGuards(AdminGuard) async remove(@Body() body:{id?:unknown}){if(typeof body?.id!=='string')fail('validationError');await this.db.posts.delete({id:body.id});return {ok:true};}
}
