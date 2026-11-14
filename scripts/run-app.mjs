// Compatibility entry point: the API is hosted by Next.js itself.
import {spawn} from 'node:child_process';
const command=process.argv[2]==='start'?'start':'dev';
const child=spawn(process.execPath,['scripts/runtime.mjs','node_modules/next/dist/bin/next',command,...process.argv.slice(3)],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
