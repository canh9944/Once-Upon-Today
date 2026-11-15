import {spawn} from 'node:child_process';
import path from 'node:path';
import Database from 'better-sqlite3';
export async function startTestBackend({dir,origin,env:extra={}}){
 const database=path.join(dir,'app.sqlite');
 const env={...process.env,CONTENT_API_URL:'',...extra,APP_URL:origin,DATABASE_PATH:database,UPLOAD_DIR:path.join(dir,'uploads'),LEGACY_STORE_PATH:path.join(dir,'store.json')};
 async function migrate(){const child=spawn(process.execPath,['--import','tsx','scripts/import-legacy.mts'],{env,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);const code=await new Promise(r=>child.once('exit',r));if(code!==0)throw new Error(output);}
 await migrate();
 return {env,stop:async()=>{},migrate,row:(sql,...params)=>{const db=new Database(database,{readonly:true});try{return db.prepare(sql).get(...params);}finally{db.close();}}};
}
