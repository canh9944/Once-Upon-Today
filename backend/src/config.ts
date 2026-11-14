import fs from 'node:fs';
import path from 'node:path';
import {config as dotenv} from 'dotenv';
function findRoot(){let folder=__dirname;for(let i=0;i<8;i++){const file=path.join(folder,'package.json');if(fs.existsSync(file)&&JSON.parse(fs.readFileSync(file,'utf8')).name==='once-upon-today-backend')return folder;folder=path.dirname(folder);}throw new Error('Backend package root not found');}
export const backendRoot=findRoot();
export const workspaceRoot=path.dirname(backendRoot);
dotenv({path:path.join(backendRoot,'.env'),quiet:true});
dotenv({path:path.join(workspaceRoot,'.env.local'),quiet:true});
const localPath=(value:string|undefined,fallback:string)=>path.resolve(backendRoot,value||fallback);
export const settings={port:Number(process.env.PORT||4000),host:process.env.HOST||'127.0.0.1',origin:new URL(process.env.APP_URL||'http://localhost:3000').origin,database:localPath(process.env.DATABASE_PATH,'data/app.sqlite'),uploads:localPath(process.env.UPLOAD_DIR,'data/uploads'),legacy:localPath(process.env.LEGACY_STORE_PATH,'../data/store.json')};
