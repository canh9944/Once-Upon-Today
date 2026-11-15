import {getPost,listPosts} from '../server/repository';
export async function publicPosts(country?:string,language?:string){return listPosts({country:country&&country!=='all'?country:undefined,language:language&&language!=='all'?language:undefined});}
export const publicPost=getPost;
