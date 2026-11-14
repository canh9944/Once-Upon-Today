import {Controller,Get,Inject,Module} from '@nestjs/common';
import {DatabaseService} from './database/database.service';
import {AuthService} from './auth/auth.service';
import {AdminGuard} from './auth/admin.guard';
import {AuthController} from './auth/auth.controller';
import {GoogleController} from './auth/google.controller';
import {PostsController} from './posts/posts.controller';
import {AnalyticsController} from './analytics/analytics.controller';
import {UploadsController} from './uploads/uploads.controller';
@Controller('health')
class HealthController{
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
  @Get() async health(){await this.db.source.query('SELECT 1');return {status:'ok',database:'sqlite'};}
}
@Module({providers:[DatabaseService,AuthService,AdminGuard],controllers:[HealthController,AuthController,GoogleController,PostsController,AnalyticsController,UploadsController]})
export class AppModule{}
