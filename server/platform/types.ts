export type Statement={sql:string;params?:unknown[]};
export interface SqlDatabase{
  all<T=Record<string,unknown>>(sql:string,params?:unknown[]):Promise<T[]>;
  run(sql:string,params?:unknown[]):Promise<{changes:number}>;
  batch(statements:Statement[]):Promise<void>;
}
export interface ObjectStorage{
  put(key:string,bytes:Uint8Array,contentType:string):Promise<void>;
  get(key:string):Promise<{bytes:Uint8Array;contentType:string}|null>;
}
export type Platform={kind:'node'|'cloudflare';db:SqlDatabase;objects:ObjectStorage;env:Record<string,string|undefined>;country?:string};
