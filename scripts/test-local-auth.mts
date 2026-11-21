import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "once-local-auth-"));
Object.assign(process.env, {
  NODE_ENV: "development",
  DEPLOY_TARGET: "",
  CONTENT_API_URL: "https://content.example",
  APP_URL: "http://localhost:3000",
  SESSION_SECRET: "local-test-only-secret-".repeat(3),
  LOCAL_AUTH_ENABLED: "true",
  DATABASE_PATH: path.join(root, "never-created.sqlite"),
  UPLOAD_DIR: path.join(root, "never-created-uploads"),
  GOOGLE_CLIENT_ID: "test-client",
  GOOGLE_CLIENT_SECRET: "test-secret",
});
const { handle } = await import("../server/api");
const { localAuthEnabled } = await import("../server/local-auth");
const req = (
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
  origin = "http://localhost:3000",
) =>
  handle(
    new Request("http://localhost:3000/api/" + path, {
      method,
      headers: {
        Origin: origin,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
assert.ok(localAuthEnabled());
const health = await (await req("health")).json();
assert.equal(health.database, null);
const before = await (await req("auth")).json();
assert.equal(before.authStorage, "memory");
assert.equal(before.remoteOrigin, undefined);
assert.equal(before.googleEnabled, true);
const signup = await req("auth/signup", "POST", {
  name: "Local Reader",
  email: "test-local@example.com",
  password: "local-test-password-2026",
});
assert.equal(signup.status, 201);
const cookie = signup.headers.get("set-cookie")!.split(";")[0];
const reader = await (await req("auth", "GET", undefined, cookie)).json();
assert.equal(reader.user.email, "test-local@example.com");
assert.equal(reader.user.role, "reader");
const credentials = {
  name: "Username Reader",
  username: "reader_123",
  password: "username-test-password",
};
const usernameSignup = await req("auth/signup", "POST", credentials);
assert.equal(usernameSignup.status, 201);
const usernameCookie = usernameSignup.headers.get("set-cookie")!.split(";")[0];
const usernameReader = (
  await (await req("auth", "GET", undefined, usernameCookie)).json()
).user;
assert.equal(usernameReader.username, "reader_123");
assert.equal(usernameReader.email, null);
assert.equal(
  (await req("auth/signup", "POST", { ...credentials, username: "READER_123" }))
    .status,
  409,
);
assert.equal(
  (
    await req("auth/signup", "POST", {
      ...credentials,
      username: "bad@example.com",
    })
  ).status,
  400,
);
assert.equal(
  (
    await req("auth", "POST", {
      username: "READER_123",
      password: credentials.password,
    })
  ).status,
  200,
);
assert.equal((await req("posts", "POST", {}, cookie)).status, 403);
assert.equal((await req("stats", "GET", undefined, cookie)).status, 403);
assert.equal((await req("uploads", "POST", {}, cookie)).status, 403);
assert.equal(
  (await req("analytics/adsconex", "GET", undefined, cookie)).status,
  401,
);
Object.assign(process.env, {
  ADMIN_USERNAME: "admin@example.com",
  ADMIN_USERNAME: "local-admin",
  ADMIN_PASSWORD: "local-admin-test-password",
  ADSCONEX_API_TOKEN: "local-adsconex-test",
});
const adminLogin = await req("auth", "POST", {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
});
assert.equal(adminLogin.status, 200);
const adminCookie = adminLogin.headers.get("set-cookie")!.split(";")[0];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  assert.equal(url.hostname, "adsconex.com");
  assert.equal(url.searchParams.get("api_token"), "local-adsconex-test");
  return Response.json({ code: "1", data: [] });
};
try {
  const response = await req(
    "analytics/adsconex?start=2025-12-07&end=2025-12-07",
    "GET",
    undefined,
    adminCookie,
  );
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.sites.length, 9);
  assert.ok(
    report.sites.every((site: { status: string }) => site.status === "empty"),
  );
  assert.equal(
    (await req("analytics", "GET", undefined, adminCookie)).status,
    403,
  );
} finally {
  globalThis.fetch = originalFetch;
}
const google = await req(
    "auth/google",
    "POST",
    { locale: "en", returnTo: "/en/posts/story?lang=vi" },
    cookie,
  ),
  url = new URL((await google.json()).url);
assert.equal(
  url.searchParams.get("redirect_uri"),
  "http://localhost:3000/api/auth/google/callback",
);
assert.equal((await req("auth", "DELETE", undefined, cookie)).status, 200);
assert.equal(
  (await (await req("auth", "GET", undefined, cookie)).json()).user,
  null,
);
const login = await req("auth", "POST", {
  email: "test-local@example.com",
  password: "local-test-password-2026",
});
assert.equal(login.status, 200);
assert.ok(login.headers.get("set-cookie"));
assert.equal(
  (
    await req("auth", "POST", {
      email: "test-local@example.com",
      password: "wrong",
    })
  ).status,
  401,
);
assert.equal(
  (await req("auth/google", "POST", {}, undefined, "https://evil.example"))
    .status,
  403,
);
assert.equal(fs.existsSync(process.env.DATABASE_PATH!), false);
assert.equal(fs.existsSync(process.env.UPLOAD_DIR!), false);
process.env.LOCAL_AUTH_ENABLED = "false";
assert.equal(
  (await (await req("auth")).json()).remoteOrigin,
  "https://content.example",
);
assert.equal(
  (await req("analytics/adsconex", "GET", undefined, adminCookie)).status,
  403,
);
process.env.NODE_ENV = "production";
assert.equal(localAuthEnabled(), false);
fs.rmdirSync(root);
console.log(
  "PASS: local modal auth state, isolated in-memory signup/login/logout, localhost Google callback, CSRF checks, production write blocking, no database/upload files and production-mode exclusion.",
);
