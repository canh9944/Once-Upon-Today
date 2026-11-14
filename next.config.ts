import type {NextConfig} from 'next';
import path from 'node:path';
const cloudflare=process.env.DEPLOY_TARGET==='cloudflare';
const adapter=path.resolve(cloudflare?'server/platform/cloudflare.ts':'server/platform/node.ts');
const config:NextConfig={distDir:cloudflare?'.next':'.next-app',output:'standalone',experimental:{cpus:2},serverExternalPackages:cloudflare?[]:['better-sqlite3'],turbopack:{resolveAlias:{'@platform':adapter}},webpack(config){/* Keep platform-specific builds separate from stale module resolution caches. */config.cache=false;config.resolve.alias['@platform']=adapter;return config;},images:{unoptimized:true}};
export default config;
