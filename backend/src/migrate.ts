import 'reflect-metadata';
import fs from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import {DatabaseService} from './database/database.service';
import {PostEntity,UserEntity,SessionEntity,EventEntity,UploadEntity,ImportEntity} from './database/entities';
import {settings} from './config';
import {eventKey} from './analytics/analytics.controller';
import {seed} from '../../shared/data';
import {brand,isContentLanguage} from '../../shared/domain';

async function main(){
  const db=new DatabaseService();await db.onModuleInit();
  try{
    let legacy:any;try{legacy=JSON.parse(await fs.readFile(settings.legacy,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;legacy={posts:seed,users:[],sessions:[],events:[]};}
    const source=path.resolve(settings.legacy);if(await db.source.getRepository(ImportEntity).existsBy({source})){console.log('Legacy import already completed; existing database left unchanged.');return;}
    const images:{filename:string;mime:string;size:number;createdAt:string}[]=[];const oldUploads=path.join(path.dirname(settings.legacy),'uploads');await fs.mkdir(settings.uploads,{recursive:true});
    for(const filename of await fs.readdir(oldUploads).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return [];throw e;})){
      if(!/^[a-f0-9-]{36}\.webp$/.test(filename))continue;const from=path.join(oldUploads,filename),to=path.join(settings.uploads,filename);const info=await fs.stat(from);if(!info.isFile())continue;
      if(path.resolve(from)!==path.resolve(to)){try{await fs.copyFile(from,to,constants.COPYFILE_EXCL);}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}}
      images.push({filename,mime:'image/webp',size:info.size,createdAt:info.birthtime.toISOString()});
    }
    await db.source.transaction(async manager=>{
      for(const p of legacy.posts||[]){if(!p.id||typeof p.content!=='string')throw new Error('Invalid legacy post');await manager.createQueryBuilder().insert().into(PostEntity).values({id:p.id,title:p.title,excerpt:p.excerpt,content:p.content,contentFormat:p.contentFormat==='html'?'html':'text',country:p.country,language:isContentLanguage(p.language)?p.language:'vi',category:p.category,image:p.image||'',author:p.author||brand,date:p.date,published:!!p.published}).orIgnore().execute();}
      for(const u of legacy.users||[])await manager.createQueryBuilder().insert().into(UserEntity).values({id:u.id,email:u.email.trim().toLowerCase(),name:u.name,passwordHash:u.passwordHash||null,googleSub:u.googleSub||null,createdAt:u.createdAt}).orIgnore().execute();
      for(const s of legacy.sessions||[])if(s.expires>Date.now())await manager.createQueryBuilder().insert().into(SessionEntity).values({hash:s.hash,userId:s.userId,expires:s.expires}).orIgnore().execute();
      for(const e of legacy.events||[])await manager.createQueryBuilder().insert().into(EventEntity).values({key:eventKey(e.visitor,e.type,e.postId,e.date),visitor:e.visitor,type:e.type,postId:e.postId,date:e.date}).orIgnore().execute();
      for(const image of images)await manager.createQueryBuilder().insert().into(UploadEntity).values(image).orIgnore().execute();
      await manager.insert(ImportEntity,{source,completedAt:new Date().toISOString()});
    });
    console.log(JSON.stringify({imported:true,posts:await db.posts.count(),users:await db.users.count(),events:await db.events.count(),images:await db.uploads.count(),sourcePreserved:true}));
  }finally{await db.onModuleDestroy();}
}
void main().catch(()=>{console.error('Import failed. Original JSON remains unchanged; check source format and database permissions.');process.exit(1);});
