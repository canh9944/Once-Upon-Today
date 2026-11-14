import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const [major,minor]=process.versions.node.split('.').map(Number);
let executable=process.execPath;
if(major<22||major===22&&minor<12){
 const local=path.resolve('.tools/node-v22.23.5-win-x64/node.exe');
 if(process.platform==='win32'&&fs.existsSync(local))executable=local;
 else throw new Error('Node.js 22.12+ is required. Install Node 22 LTS and retry.');
}
const child=spawn(executable,process.argv.slice(2),{stdio:'inherit',env:{...process.env,PATH:path.dirname(executable)+path.delimiter+process.env.PATH}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>process.exitCode=code??1);
