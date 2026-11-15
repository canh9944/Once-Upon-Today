import fs from 'node:fs';
import path from 'node:path';

// Share the runtime migration ledger so ALTER migrations run exactly once.
export function migrateLocal(db){
 db.exec('CREATE TABLE IF NOT EXISTS app_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
 for(const file of fs.readdirSync('database/migrations').filter(f=>f.endsWith('.sql')).sort()){
  if(db.prepare('SELECT 1 FROM app_migrations WHERE version=?').get(file))continue;
  db.transaction(()=>{db.exec(fs.readFileSync(path.join('database/migrations',file),'utf8'));db.prepare('INSERT INTO app_migrations VALUES(?,?)').run(file,new Date().toISOString());})();
 }
}
