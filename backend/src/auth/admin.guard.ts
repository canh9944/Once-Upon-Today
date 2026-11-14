import {Inject,Injectable,type CanActivate,type ExecutionContext} from '@nestjs/common';
import {AuthService} from './auth.service';
@Injectable()
export class AdminGuard implements CanActivate{
  constructor(@Inject(AuthService) private readonly auth:AuthService){}
  async canActivate(context:ExecutionContext){const req=context.switchToHttp().getRequest();await this.auth.admin(req,req.method!=='GET');return true;}
}
