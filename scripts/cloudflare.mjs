import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const command=process.argv[2];
if(!['build','preview','deploy'].includes(command))throw new Error('Invalid command');
const output=path.resolve('.open-next');
function patchOpenNextBuild(){
 const require=createRequire(import.meta.url);
 const cloudflareRequire=createRequire(require.resolve('@opennextjs/cloudflare'));
 const file=cloudflareRequire.resolve('@opennextjs/aws/overrides/converters/edge.js');
 const source=fs.readFileSync(file,'utf8');
 // cookie 1.x exposes named exports in its ESM entry, including on workerd.
 const patched=source.replace('import cookieParser from "cookie";','import * as cookieParser from "cookie";');
 if(patched!==source)fs.writeFileSync(file,patched);
 // This app disables Next.js image optimization. Sharp's native binary cannot run in workerd.
 const bundleFile=path.join(path.dirname(cloudflareRequire.resolve('@opennextjs/cloudflare')), '../cli/build/bundle-server.js');
 const bundleSource=fs.readFileSync(bundleFile,'utf8');
 const bundlePatched=bundleSource.replace('alias: getShimAliases(path.join(outputDir, "cloudflare-templates/shims"), useOg),','alias: { ...getShimAliases(path.join(outputDir, "cloudflare-templates/shims"), useOg), sharp: path.join(outputDir, "cloudflare-templates/shims/throw.js") },');
 if(bundlePatched!==bundleSource)fs.writeFileSync(bundleFile,bundlePatched);
 // Route this manifest through OpenNext's manifest inliner on Workers.
 const serverFile=require.resolve('next/dist/server/next-server.js');
 const serverSource=fs.readFileSync(serverFile,'utf8');
 const serverPatched=serverSource.replace('const manifest = require(this.middlewareManifestPath);','const manifest = (0, _loadmanifestexternal.loadManifest)(this.middlewareManifestPath);');
 if(serverPatched!==serverSource)fs.writeFileSync(serverFile,serverPatched);
 if(process.platform==='win32'){
  // pnpm's directory links can be recreated as junctions without symlink privileges.
  const traceFile=cloudflareRequire.resolve('@opennextjs/aws/build/copyTracedFiles.js');
  const traceSource=fs.readFileSync(traceFile,'utf8');
  const tracePatched=traceSource.replace('symlinkSync(symlink, to);','symlinkSync(symlink, to, statSync(from).isDirectory() ? "junction" : "file");');
  if(tracePatched!==traceSource)fs.writeFileSync(traceFile,tracePatched);
 }
}
function verifyStaticAssets(){
 const next=path.join(output,'server-functions/default/.next');
 const assets=path.join(output,'assets/_next');
 const references=new Set();
 function readManifest(file){
  const contents=fs.readFileSync(file,'utf8');
  for(const [reference] of contents.matchAll(/static\/(?:chunks|css|media)\/[^"'\s,]+?\.(?:js|css|woff2?)\b/g))references.add(reference);
 }
 function readClientManifests(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
   const file=path.join(directory,entry.name);
   if(entry.isDirectory())readClientManifests(file);
   else if(entry.name.endsWith('_client-reference-manifest.js'))readManifest(file);
  }
 }
 readManifest(path.join(next,'build-manifest.json'));
 readClientManifests(path.join(next,'server/app'));
 if(!references.size)throw new Error('No Next.js static assets found in the Worker manifests.');
 const missing=[...references].filter(reference=>!fs.existsSync(path.join(assets,decodeURIComponent(reference))));
 if(missing.length)throw new Error(`Cloudflare build is missing ${missing.length} referenced static assets: ${missing.slice(0,5).join(', ')}. Run npm run build:cloudflare before deploying.`);
}
async function sanitizeBuild(){
 verifyStaticAssets();
 const file=path.join(output,'cloudflare/next-env.mjs'),envs=await import(pathToFileURL(file).href+'?t='+Date.now());
 const privateValues=Object.values(envs).flatMap(env=>Object.entries(env).filter(([key,value])=>!key.startsWith('NEXT_PUBLIC_')&&typeof value==='string'&&value.length>=8).map(([,value])=>value));
 fs.writeFileSync(file,['production','development','test'].map(mode=>`export const ${mode} = ${JSON.stringify(Object.fromEntries(Object.entries(envs[mode]).filter(([key])=>key.startsWith('NEXT_PUBLIC_'))))};`).join('\n'));
 function scan(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const target=path.join(directory,entry.name);if(entry.isDirectory())scan(target);else if(/\.(m?js|json)$/.test(entry.name)){const text=fs.readFileSync(target,'utf8');if(privateValues.some(value=>text.includes(value)))throw new Error('Private environment value found in Cloudflare output; deployment blocked.');}}}
 const handler=fs.readFileSync(path.join(output,'server-functions/default/handler.mjs'),'utf8');
 if(handler.includes('data/app.sqlite')||!handler.includes('Missing DB/MEDIA Cloudflare bindings'))throw new Error('Wrong storage adapter in Worker bundle; deployment blocked.');
 scan(output);
 console.log('Cloudflare output checked: private .env values excluded; runtime secrets must be configured with Wrangler.');
}
if(command==='deploy'){
 const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
 if(!config.vars.APP_URL.startsWith('https://')||config.d1_databases.some(db=>db.database_id.includes('REPLACE_')))throw new Error('Set production APP_URL and D1 database_id in wrangler.jsonc first.');
 await sanitizeBuild();
}
if(command==='build')patchOpenNextBuild();
const child=spawn(process.execPath,['node_modules/@opennextjs/cloudflare/dist/cli/index.js',command,...process.argv.slice(3)],{stdio:'inherit',env:{...process.env,DEPLOY_TARGET:'cloudflare'}});
const code=await new Promise((resolve,reject)=>{child.on('exit',resolve);child.on('error',reject);});
if(code!==0)process.exitCode=code??1;else if(command==='build')await sanitizeBuild();
