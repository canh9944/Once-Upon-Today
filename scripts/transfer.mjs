import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Database from 'better-sqlite3';

// One provider-neutral bundle: data.json + SQL + media files with SHA-256.
// Sessions/rate limits are intentionally excluded; visitors log in again after migration.
const [action,provider='local',folder]=process.argv.slice(2);
if(!['export','import'].includes(action)||!['local','cloudflare','cloudflare-local'].includes(provider)||!folder)throw new Error('Usage: npm run backup|restore -- local|cloudflare|cloudflare-local <folder>');
const remote=provider==='cloudflare'?'--remote':'--local',cloud=provider!=='local',root=path.resolve(folder),tables=['posts','users','events','uploads','imports'];
const config=cloud?JSON.parse(fs.readFileSync(process.env.ONCE_WRANGLER_CONFIG||'wrangler.jsonc','utf8')):{r2_buckets:[{bucket_name:''}],d1_databases:[]},bucket=config.r2_buckets[0].bucket_name;
function wrangler(args,json=false){if(process.env.ONCE_WRANGLER_CONFIG)args.push('--config',process.env.ONCE_WRANGLER_CONFIG);if(process.env.ONCE_PERSIST_TO)args.push('--persist-to',process.env.ONCE_PERSIST_TO);const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{encoding:'utf8',maxBuffer:256*1024*1024,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(result.status!==0)throw new Error(result.stderr||result.stdout);if(json){const start=result.stdout.indexOf('[');if(start<0)throw new Error('Invalid Wrangler JSON');return JSON.parse(result.stdout.slice(start));}return result.stdout;}
if(provider==='cloudflare'&&config.d1_databases.some(db=>db.database_id.includes('REPLACE_')))throw new Error('Set the D1 database_id in wrangler.jsonc first.');
let local;
if(!cloud){try{process.loadEnvFile('.env.local');}catch{}const file=path.resolve(process.env.DATABASE_PATH||'data/app.sqlite');if(action==='export'&&!fs.existsSync(file))throw new Error('Database does not exist; run npm run db:import');fs.mkdirSync(path.dirname(file),{recursive:true});local=new Database(file);for(const f of fs.readdirSync('database/migrations').filter(f=>f.endsWith('.sql')).sort())local.exec(fs.readFileSync(path.join('database/migrations',f),'utf8'));}
const read=table=>cloud?wrangler(['d1','execute','DB',remote,'--command',`SELECT * FROM ${table}`,'--json'],true).flatMap(r=>r.results):local.prepare(`SELECT * FROM ${table}`).all();
const quote=value=>value===null?'NULL':typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 if(action==='export'){
  if(fs.existsSync(root))throw new Error('Choose a new backup directory; existing backups are never overwritten.');fs.mkdirSync(path.join(root,'media'),{recursive:true});
  let data;
  if(local)data=local.transaction(()=>Object.fromEntries(tables.map(t=>[t,read(t)])))();else data=Object.fromEntries(tables.map(t=>[t,read(t)]));
  const manifest=[];
  for(const image of data.uploads){if(!/^[a-f0-9-]{36}\.(webp|png|jpg)$/.test(image.filename))throw new Error('Invalid image key');const destination=path.join(root,'media',image.filename);if(cloud)wrangler(['r2','object','get',`${bucket}/${image.filename}`,remote,'--file',destination]);else fs.copyFileSync(path.join(process.env.UPLOAD_DIR||'data/uploads',image.filename),destination);manifest.push({key:image.filename,sha256:hash(fs.readFileSync(destination))});}
  fs.writeFileSync(path.join(root,'data.json'),JSON.stringify({version:1,createdAt:new Date().toISOString(),tables:data,media:manifest}));
  console.log(`Backup written to ${root}. Keep it private: it includes email addresses and password hashes.`);
 }else{
  const bundle=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));if(bundle.version!==1)throw new Error('Unsupported backup version');
  for(const image of bundle.media){if(!/^[a-f0-9-]{36}\.(webp|png|jpg)$/.test(image.key)||hash(fs.readFileSync(path.join(root,'media',image.key)))!==image.sha256)throw new Error('Image integrity failure');}
  for(const t of tables)if(read(t).length)throw new Error(`Destination ${t} is not empty. Restore into a fresh database.`);
  const sql=[];for(const t of tables)for(const row of bundle.tables[t]){const columns=Object.keys(row);if(columns.some(c=>!/^\w+$/.test(c)))throw new Error('Invalid column');sql.push(`INSERT INTO ${t} (${columns.join(',')}) VALUES (${columns.map(c=>quote(row[c])).join(',')});`);}
  // Copy media first. Retrying after a DB failure is safe; object names do not change.
  for(const image of bundle.tables.uploads){const source=path.join(root,'media',image.filename);if(!bundle.media.some(m=>m.key===image.filename))throw new Error('Missing image manifest');if(cloud)wrangler(['r2','object','put',`${bucket}/${image.filename}`,remote,'--file',source,'--content-type',image.mime]);else{const destination=path.join(process.env.UPLOAD_DIR||'data/uploads',image.filename);fs.mkdirSync(path.dirname(destination),{recursive:true});if(fs.existsSync(destination)&&hash(fs.readFileSync(destination))!==hash(fs.readFileSync(source)))throw new Error('Existing image differs');fs.copyFileSync(source,destination);}}
  if(cloud){const file=path.join(root,'restore.sql');fs.writeFileSync(file,sql.join('\n'));wrangler(['d1','execute','DB',remote,'--file',file]);}else local.transaction(()=>{for(const statement of sql)local.exec(statement);})();
  console.log('Restore complete. Check record counts and images before changing DNS.');
 }
}finally{local?.close();}
