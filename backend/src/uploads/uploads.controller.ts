import {BadRequestException,Controller,Get,Inject,Param,Post,Res,UploadedFile,UseGuards,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import type {Response} from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {AdminGuard} from '../auth/admin.guard';
import {fail} from '../auth/auth.service';
import {DatabaseService} from '../database/database.service';
import {settings} from '../config';
import {MAX_IMAGE_BYTES} from '../../../shared/content';
@Controller('uploads')
export class UploadsController{
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
  @Post() @UseGuards(AdminGuard) @UseInterceptors(FileInterceptor('file',{limits:{fileSize:MAX_IMAGE_BYTES,files:1,fields:5},fileFilter:(_req,file,cb)=>{if(!['image/jpeg','image/png','image/webp'].includes(file.mimetype))cb(new BadRequestException({code:'uploadType'}),false);else cb(null,true);}}))
  async upload(@UploadedFile() file:Express.Multer.File){
    if(!file?.buffer?.length)fail('uploadType');let image:Buffer;
    try{image=await sharp(file.buffer,{limitInputPixels:25_000_000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();}catch{fail('uploadFailed');}
    const filename=`${randomUUID()}.webp`;await fs.mkdir(settings.uploads,{recursive:true});await fs.writeFile(path.join(settings.uploads,filename),image,{flag:'wx'});
    try{await this.db.uploads.insert({filename,mime:'image/webp',size:image.length,createdAt:new Date().toISOString()});}catch(e){await fs.unlink(path.join(settings.uploads,filename));throw e;}
    return {url:`/api/uploads/${filename}`,size:image.length};
  }
  @Get(':filename') async image(@Param('filename') filename:string,@Res() res:Response){
    if(!/^[a-f0-9-]{36}\.webp$/.test(filename)||!await this.db.uploads.existsBy({filename}))fail('notFound',404);
    let bytes:Buffer;try{bytes=await fs.readFile(path.join(settings.uploads,filename));}catch{fail('notFound',404);}
    res.set({'Content-Type':'image/webp','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable'}).send(bytes);
  }
}
