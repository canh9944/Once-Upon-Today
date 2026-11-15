ALTER TABLE users ADD COLUMN facebookSub TEXT;
ALTER TABLE users ADD COLUMN appleSub TEXT;
CREATE UNIQUE INDEX users_facebook_sub ON users(facebookSub);
CREATE UNIQUE INDEX users_apple_sub ON users(appleSub);
