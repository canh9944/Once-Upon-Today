import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {Catch,HttpException,type ArgumentsHost,type ExceptionFilter} from '@nestjs/common';
import type {Request,Response} from 'express';
import {json} from 'express';
import cookieParser from 'cookie-parser';
import {AppModule} from './app.module';
import {settings} from './config';
@Catch()
class ApiExceptionFilter implements ExceptionFilter{
  catch(error:unknown,host:ArgumentsHost){const context=host.switchToHttp(),req=context.getRequest<Request>(),res=context.getResponse<Response>();const status=error instanceof HttpException?error.getStatus():500;const payload=error instanceof HttpException?error.getResponse():null;const code=payload&&typeof payload==='object'&&'code' in payload?payload.code:status===413&&req.path.includes('/uploads')?'uploadSize':'requestError';res.status(status).json({code});}
}
async function main(){
  const app=await NestFactory.create(AppModule,{bodyParser:false});
  const server=app.getHttpAdapter().getInstance();server.set('trust proxy',1);
  app.use(json({limit:'3mb'}));app.use(cookieParser());app.use((_req:Request,res:Response,next:()=>void)=>{res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');next();});
  app.enableCors({origin:settings.origin,credentials:true});app.setGlobalPrefix('api');app.useGlobalFilters(new ApiExceptionFilter());app.enableShutdownHooks();
  await app.listen(settings.port,settings.host);console.log(`Backend ready: http://${settings.host}:${settings.port}/api/health`);
}
void main().catch(()=>{console.error('Backend could not start. Check database permissions, port and environment configuration.');process.exit(1);});
