import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import Database from 'better-sqlite3';
import {migrateLocal} from './migrate-local.mjs';
import {seed} from '../shared/data';
import {brand,isContentLanguage} from '../shared/domain';
// CLI only: never runs during a build or modifies the original store.
if(!process.env.DATABASE_PATH){try{process.loadEnvFile('.env.local');}catch{}}
const target=path.resolve(process.env.DATABASE_PATH||'data/app.sqlite');
fs.mkdirSync(path.dirname(target),{recursive:true});
const previous=path.resolve('backend/data/app.sqlite');
if(!fs.existsSync(target)&&fs.existsSync(previous)&&!process.env.LEGACY_STORE_PATH){const old=new Database(previous,{readonly:true});await old.backup(target);old.close();console.log('Copied existing NestJS database; original preserved.');}
const db=new Database(target);db.pragma('journal_mode = WAL');db.pragma('busy_timeout = 5000');
migrateLocal(db);
const source=path.resolve(process.env.LEGACY_STORE_PATH||'data/store.json');
if(!db.prepare('SELECT 1 FROM imports WHERE source=?').get(source)){
 const legacy=fs.existsSync(source)?JSON.parse(fs.readFileSync(source,'utf8')):{posts:seed};
 // Never mix demo/legacy data into a populated database copied from NestJS.
 if(!db.prepare('SELECT 1 FROM posts LIMIT 1').get())db.transaction(()=>{
  for(const p of legacy.posts||[])db.prepare('INSERT OR IGNORE INTO posts(id,title,excerpt,content,contentFormat,country,language,category,image,author,date,published) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(p.id,p.title,p.excerpt,p.content,p.contentFormat==='html'?'html':'text',p.country,isContentLanguage(p.language)?p.language:'vi',p.category,p.image||'',p.author||brand,p.date,Number(!!p.published));
  for(const u of legacy.users||[])db.prepare('INSERT OR IGNORE INTO users(id,email,name,passwordHash,googleSub,createdAt) VALUES(?,?,?,?,?,?)').run(u.id,u.email.trim().toLowerCase(),u.name,u.passwordHash||null,u.googleSub||null,u.createdAt);
  for(const e of legacy.events||[]){const key=createHash('sha256').update(JSON.stringify([e.visitor,e.type,e.postId,e.type==='view'?e.date.slice(0,10):'once'])).digest('hex');db.prepare('INSERT OR IGNORE INTO events(key,visitor,type,postId,date) VALUES(?,?,?,?,?)').run(key,e.visitor,e.type,e.postId,e.date);}
 })();
 db.prepare('INSERT INTO imports VALUES(?,?)').run(source,new Date().toISOString());
}
const uploads=path.resolve(process.env.UPLOAD_DIR||'data/uploads');fs.mkdirSync(uploads,{recursive:true});
for(const folder of [path.resolve('backend/data/uploads'),path.join(path.dirname(source),'uploads')])if(fs.existsSync(folder))for(const key of fs.readdirSync(folder)){
 if(!/^[a-f0-9-]{36}\.(webp|jpg|png)$/.test(key))continue;const destination=path.join(uploads,key);if(!fs.existsSync(destination))fs.copyFileSync(path.join(folder,key),destination,fs.constants.COPYFILE_EXCL);
 const info=fs.statSync(destination);db.prepare('INSERT OR IGNORE INTO uploads(filename,mime,size,createdAt) VALUES(?,?,?,?)').run(key,key.endsWith('png')?'image/png':key.endsWith('webp')?'image/webp':'image/jpeg',info.size,info.birthtime.toISOString());
}
console.log(JSON.stringify({posts:db.prepare('SELECT COUNT(*) count FROM posts').get(),users:db.prepare('SELECT COUNT(*) count FROM users').get(),sourcePreserved:true}));db.close();
