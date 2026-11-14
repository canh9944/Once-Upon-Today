import {Injectable,type OnModuleInit,type OnModuleDestroy} from '@nestjs/common';
import {DataSource} from 'typeorm';
import fs from 'node:fs';
import path from 'node:path';
import {settings} from '../config';
import {PostEntity,UserEntity,SessionEntity,EventEntity,UploadEntity,RateLimitEntity,ImportEntity} from './entities';
import {InitialSchema1794600000000} from './initial.migration';
@Injectable()
export class DatabaseService implements OnModuleInit,OnModuleDestroy{
  readonly source=new DataSource({type:'better-sqlite3',database:settings.database,entities:[PostEntity,UserEntity,SessionEntity,EventEntity,UploadEntity,RateLimitEntity,ImportEntity],migrations:[InitialSchema1794600000000],synchronize:false,logging:false});
  get posts(){return this.source.getRepository(PostEntity);}get users(){return this.source.getRepository(UserEntity);}get sessions(){return this.source.getRepository(SessionEntity);}get events(){return this.source.getRepository(EventEntity);}get uploads(){return this.source.getRepository(UploadEntity);}
  async onModuleInit(){fs.mkdirSync(path.dirname(settings.database),{recursive:true});await this.source.initialize();await this.source.query('PRAGMA journal_mode=WAL');await this.source.query('PRAGMA busy_timeout=5000');await this.source.runMigrations();}
  async onModuleDestroy(){if(this.source.isInitialized)await this.source.destroy();}
}
