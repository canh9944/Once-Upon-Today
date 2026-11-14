import {getPost,listPosts} from '../server/repository';
export async function publicPosts(country?:string){return listPosts({country:country&&country!=='all'?country:undefined});}
export const publicPost=getPost;
