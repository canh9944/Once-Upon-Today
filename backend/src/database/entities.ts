import {Column,Entity,Index,PrimaryColumn} from 'typeorm';
@Entity('posts')
@Index(['published','country'])
@Index(['language'])
export class PostEntity{
  @PrimaryColumn('varchar') id!:string;
  @Column('varchar') title!:string;
  @Column('text') excerpt!:string;
  @Column('text') content!:string;
  @Column('varchar',{default:'text'}) contentFormat!:'text'|'html';
  @Column('varchar') country!:string;
  @Column('varchar') language!:string;
  @Column('varchar') category!:string;
  @Column('text',{default:''}) image!:string;
  @Column('varchar') author!:string;
  @Column('varchar') date!:string;
  @Column('boolean') published!:boolean;
}
@Entity('users')
export class UserEntity{
  @PrimaryColumn('varchar') id!:string;
  @Index({unique:true}) @Column('varchar') email!:string;
  @Column('varchar') name!:string;
  @Column('text',{nullable:true}) passwordHash!:string|null;
  @Index({unique:true}) @Column('varchar',{nullable:true}) googleSub!:string|null;
  @Column('varchar') createdAt!:string;
}
@Entity('sessions')
export class SessionEntity{
  @PrimaryColumn('varchar') hash!:string;
  @Index() @Column('varchar') userId!:string;
  @Index() @Column('integer') expires!:number;
}
@Entity('events')
export class EventEntity{
  @PrimaryColumn('varchar') key!:string;
  @Index() @Column('varchar') visitor!:string;
  @Column('varchar') type!:'view'|'like';
  @Index() @Column('varchar') postId!:string;
  @Index() @Column('varchar') date!:string;
}
@Entity('uploads')
export class UploadEntity{
  @PrimaryColumn('varchar') filename!:string;
  @Column('varchar') mime!:string;
  @Column('integer') size!:number;
  @Column('varchar') createdAt!:string;
}
@Entity('rate_limits')
export class RateLimitEntity{
  @PrimaryColumn('varchar') key!:string;
  @Column('integer') count!:number;
  @Column('integer') resetAt!:number;
}
@Entity('imports')
export class ImportEntity{
  @PrimaryColumn('varchar') source!:string;
  @Column('varchar') completedAt!:string;
}
