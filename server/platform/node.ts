import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type {Platform,SqlDatabase,Statement} from './types';
import {contentOrigin} from '../remote-content';
import {localAuthEnabled} from '../local-auth';
let singleton:Platform|undefined;
let localAuth:Platform|undefined;
export function getPlatform():Platform{
  if(contentOrigin()){
    if(!localAuthEnabled())throw new Error('Local database is disabled in API content mode.');
    if(localAuth)return localAuth;
    const connection=new Database(':memory:');
    connection.exec('CREATE TABLE users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,passwordHash TEXT,googleSub TEXT UNIQUE,createdAt TEXT NOT NULL,facebookSub TEXT UNIQUE,appleSub TEXT UNIQUE);CREATE TABLE sessions (hash TEXT PRIMARY KEY,userId TEXT NOT NULL,expires INTEGER NOT NULL);CREATE TABLE rate_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,resetAt INTEGER NOT NULL)');
    const db:SqlDatabase={all:async<T>(sql:string,params:unknown[]=[])=>connection.prepare(sql).all(...params) as T[],run:async(sql,params=[])=>({changes:connection.prepare(sql).run(...params).changes}),batch:async(statements:Statement[])=>{connection.transaction(()=>{for(const s of statements)connection.prepare(s.sql).run(...(s.params||[]));})();}};
    localAuth={kind:'node',db,env:process.env,objects:{put:async()=>{throw new Error('Uploads are disabled in API content mode.');},get:async()=>null}};
    return localAuth;
  }
  if(singleton)return singleton;
  const dbPath=path.resolve(process.env.DATABASE_PATH||'data/app.sqlite');fs.mkdirSync(path.dirname(dbPath),{recursive:true});
  const connection=new Database(dbPath);connection.pragma('journal_mode = WAL');connection.pragma('busy_timeout = 5000');
  connection.exec('CREATE TABLE IF NOT EXISTS app_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const migrations=path.resolve('database/migrations');
  for(const file of fs.readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort())if(!connection.prepare('SELECT 1 FROM app_migrations WHERE version=?').get(file))connection.transaction(()=>{connection.exec(fs.readFileSync(path.join(migrations,file),'utf8'));connection.prepare('INSERT INTO app_migrations VALUES(?,?)').run(file,new Date().toISOString());})();
  const db:SqlDatabase={all:async<T>(sql:string,params:unknown[]=[])=>connection.prepare(sql).all(...params) as T[],run:async(sql,params=[])=>({changes:connection.prepare(sql).run(...params).changes}),batch:async(statements:Statement[])=>{connection.transaction(()=>{for(const s of statements)connection.prepare(s.sql).run(...(s.params||[]));})();}};
  const directory=path.resolve(process.env.UPLOAD_DIR||'data/uploads');fs.mkdirSync(directory,{recursive:true});
  singleton={kind:'node',db,env:process.env,objects:{put:async(key,bytes)=>{fs.writeFileSync(path.join(directory,key),bytes);},get:async key=>{try{const bytes=new Uint8Array(fs.readFileSync(path.join(directory,key)));return {bytes,contentType:key.endsWith('.webp')?'image/webp':key.endsWith('.png')?'image/png':'image/jpeg'};}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}}};
  return singleton;
}
