CREATE TABLE users_with_usernames (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE,
  username TEXT COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  passwordHash TEXT,
  googleSub TEXT UNIQUE,
  createdAt TEXT NOT NULL,
  facebookSub TEXT UNIQUE,
  appleSub TEXT UNIQUE,
  CHECK (email IS NOT NULL OR username IS NOT NULL)
);
INSERT INTO users_with_usernames (id,email,name,passwordHash,googleSub,createdAt,facebookSub,appleSub)
SELECT id,email,name,passwordHash,googleSub,createdAt,facebookSub,appleSub FROM users;
DROP TABLE users;
ALTER TABLE users_with_usernames RENAME TO users;
