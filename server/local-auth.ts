import {contentOrigin} from './remote-content';

/** Development-only accounts/sessions; public content still comes from production. */
export function localAuthEnabled(){
 if(!contentOrigin()||process.env.LOCAL_AUTH_ENABLED==='false'||!process.env.APP_URL)return false;
 try{const app=new URL(process.env.APP_URL);return ['localhost','127.0.0.1','[::1]'].includes(app.hostname)||process.env.LOCAL_AUTH_ENABLED==='true'&&app.protocol==='https:';}catch{return false;}
}
