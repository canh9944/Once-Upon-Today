import {type MigrationInterface,type QueryRunner} from 'typeorm';
export class InitialSchema1794600000000 implements MigrationInterface{
  async up(q:QueryRunner){
    await q.query(`CREATE TABLE posts (id varchar PRIMARY KEY NOT NULL,title varchar NOT NULL,excerpt text NOT NULL,content text NOT NULL,contentFormat varchar NOT NULL DEFAULT 'text',country varchar NOT NULL,language varchar NOT NULL,category varchar NOT NULL,image text NOT NULL DEFAULT '',author varchar NOT NULL,date varchar NOT NULL,published boolean NOT NULL)`);
    await q.query('CREATE INDEX posts_country_published ON posts(published,country)');
    await q.query('CREATE INDEX posts_language ON posts(language)');
    await q.query('CREATE TABLE users (id varchar PRIMARY KEY NOT NULL,email varchar NOT NULL UNIQUE,name varchar NOT NULL,passwordHash text,googleSub varchar UNIQUE,createdAt varchar NOT NULL)');
    await q.query('CREATE TABLE sessions (hash varchar PRIMARY KEY NOT NULL,userId varchar NOT NULL,expires integer NOT NULL)');
    await q.query('CREATE INDEX sessions_user ON sessions(userId)');await q.query('CREATE INDEX sessions_expiry ON sessions(expires)');
    await q.query('CREATE TABLE events (key varchar PRIMARY KEY NOT NULL,visitor varchar NOT NULL,type varchar NOT NULL,postId varchar NOT NULL,date varchar NOT NULL)');
    await q.query('CREATE INDEX events_visitor ON events(visitor)');await q.query('CREATE INDEX events_post ON events(postId)');await q.query('CREATE INDEX events_date ON events(date)');
    await q.query('CREATE TABLE uploads (filename varchar PRIMARY KEY NOT NULL,mime varchar NOT NULL,size integer NOT NULL,createdAt varchar NOT NULL)');
    await q.query('CREATE TABLE rate_limits (key varchar PRIMARY KEY NOT NULL,count integer NOT NULL,resetAt integer NOT NULL)');
    await q.query('CREATE TABLE imports (source varchar PRIMARY KEY NOT NULL,completedAt varchar NOT NULL)');
  }
  async down(q:QueryRunner){for(const name of ['imports','rate_limits','uploads','events','sessions','users','posts'])await q.query(`DROP TABLE ${name}`);}
}
