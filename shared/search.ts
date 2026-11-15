import type {Post} from './data';

export type SearchStory=Pick<Post,'id'|'title'|'image'|'category'|'language'|'author'>&{views:number};
export function normalizeSearch(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/ı/g,'i').toLowerCase().trim();
}
