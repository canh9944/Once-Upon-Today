import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import sharp from "sharp";
import Database from "better-sqlite3";
const dir = fs.mkdtempSync(path.join(tmpdir(), "once-cloudflare-")),
  origin = "http://localhost:8787",
  password = randomBytes(24).toString("hex");
const config = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));
config.main = path.resolve(".open-next/worker.js");
config.assets.directory = path.resolve(".open-next/assets");
config.d1_databases[0].database_id = "00000000-0000-0000-0000-000000000001";
config.d1_databases[0].migrations_dir = path.resolve("database/migrations");
config.vars = {
  APP_URL: origin,
  ADMIN_USERNAME: "test@example.com",
  ADMIN_PASSWORD: password,
  SESSION_SECRET: randomBytes(32).toString("hex"),
};
const file = path.join(dir, "wrangler.json");
fs.writeFileSync(file, JSON.stringify(config));
const cli = "node_modules/wrangler/bin/wrangler.js",
  args = ["--config", file, "--persist-to", path.join(dir, "state")],
  env = { ...process.env, WRANGLER_SEND_METRICS: "false" };
const migration = spawnSync(
  process.execPath,
  [cli, "d1", "migrations", "apply", "DB", "--local", ...args],
  { env, encoding: "utf8" },
);
assert.equal(migration.status, 0, migration.stdout + migration.stderr);
const child = spawn(
  process.execPath,
  [cli, "dev", "--local", "--port", "8787", "--inspector-port", "0", ...args],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let output = "";
child.stdout.on("data", (d) => (output += d));
child.stderr.on("data", (d) => (output += d));
let cookie = "";
const request = (url, method = "GET", body, auth = false) =>
  fetch(origin + url, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(auth ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
try {
  let ready = false;
  for (let i = 0; i < 30; i++) {
    if (child.exitCode !== null) throw new Error(output.slice(-6000));
    try {
      if ((await request("/api/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  assert.ok(ready, output.slice(-6000));
  assert.equal((await (await request("/api/health")).json()).database, "d1");
  const browserSession = await fetch(origin + "/api/auth", {
    headers: { Cookie: "diagnostic=1" },
  });
  assert.equal(browserSession.status, 200, await browserSession.clone().text());
  const login = await request("/api/auth", "POST", {
    email: "test@example.com",
    password,
  });
  assert.equal(login.status, 200, await login.clone().text());
  cookie = login.headers.get("set-cookie").split(";")[0];
  const adminCookie = cookie;
  const readerPassword = randomBytes(20).toString("hex"),
    signup = await request("/api/auth/signup", "POST", {
      name: "Cloud Reader",
      email: "reader@example.com",
      password: readerPassword,
    });
  assert.equal(signup.status, 201, await signup.clone().text());
  cookie = signup.headers.get("set-cookie").split(";")[0];
  assert.equal((await request("/api/stats", "GET", null, true)).status, 401);
  await request("/api/auth", "DELETE", null, true);
  assert.equal(
    (
      await request("/api/auth", "POST", {
        email: "reader@example.com",
        password: readerPassword,
      })
    ).status,
    200,
  );
  cookie = adminCookie;
  const pixels = await sharp({
      create: { width: 20, height: 10, channels: 3, background: "#112233" },
    })
      .webp()
      .toBuffer(),
    form = new FormData();
  form.set("file", new Blob([pixels], { type: "image/webp" }), "test.webp");
  const uploaded = await fetch(origin + "/api/uploads", {
    method: "POST",
    headers: { Origin: origin, Cookie: cookie },
    body: form,
  });
  assert.equal(uploaded.status, 201, await uploaded.clone().text());
  const { url: image } = await uploaded.json();
  const served = await fetch(origin + image);
  assert.equal(served.headers.get("content-type"), "image/webp");
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), pixels);
  const draft = {
    id: randomUUID(),
    title: "Cloud story",
    excerpt: "D1 and R2",
    content:
      "<h2>Cloud</h2><p>" +
      "Rich text. ".repeat(4000) +
      "</p><script>alert(1)</script>",
    contentFormat: "html",
    country: "FR",
    language: "fr",
    category: "Culture",
    image,
    published: true,
  };
  const saved = await request("/api/posts", "POST", draft, true);
  assert.equal(saved.status, 200, await saved.clone().text());
  const { post } = await saved.json();
  assert.ok(post.content.length > 30000);
  assert.ok(!post.content.includes("<script"));
  assert.equal(post.author, "Once Upon Today");
  assert.equal(
    (await (await request("/api/posts?country=FR")).json()).posts.length,
    1,
  );
  assert.equal(
    (await (await request("/api/posts?country=VN")).json()).posts.length,
    0,
  );
  const page = await request(`/fr/posts/${post.id}?country=FR`);
  assert.equal(page.status, 200, output);
  assert.ok((await page.text()).includes("<h2>Cloud</h2>"));
  assert.equal((await request("/en")).status, 200);
  for (let i = 0; i < 2; i++)
    await request("/api/events", "POST", {
      visitor: "cf-test",
      type: "view",
      postId: post.id,
    });
  await request("/api/events", "POST", {
    visitor: "cf-test",
    type: "like",
    postId: post.id,
  });
  const stats = await (await request("/api/stats", "GET", null, true)).json();
  assert.equal(stats.views, 1);
  assert.equal(stats.likes, 1);
  assert.equal(stats.users, 1);
  const csrf = await fetch(origin + "/api/posts", {
    method: "DELETE",
    headers: {
      Cookie: cookie,
      Origin: "https://other.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: post.id }),
  });
  assert.equal(csrf.status, 403);
  // Read D1 and R2 through the actual migration CLI, then restore into a fresh VPS SQLite store.
  const transferEnv = {
      ...env,
      ONCE_WRANGLER_CONFIG: file,
      ONCE_PERSIST_TO: path.join(dir, "state"),
    },
    bundle = path.join(dir, "backup");
  const exported = spawnSync(
    process.execPath,
    ["scripts/transfer.mjs", "export", "cloudflare-local", bundle],
    { env: transferEnv, encoding: "utf8" },
  );
  assert.equal(exported.status, 0, exported.stdout + exported.stderr);
  const restored = spawnSync(
    process.execPath,
    ["scripts/transfer.mjs", "import", "local", bundle],
    {
      env: {
        ...env,
        DATABASE_PATH: path.join(dir, "vps.sqlite"),
        UPLOAD_DIR: path.join(dir, "vps-uploads"),
      },
      encoding: "utf8",
    },
  );
  assert.equal(restored.status, 0, restored.stdout + restored.stderr);
  const connection = new Database(path.join(dir, "vps.sqlite"), {
    readonly: true,
  });
  assert.equal(
    connection.prepare("SELECT content FROM posts WHERE id=?").get(post.id)
      .content,
    post.content,
  );
  assert.equal(
    connection.prepare("SELECT COUNT(*) count FROM users").get().count,
    1,
  );
  assert.equal(
    connection.prepare("SELECT COUNT(*) count FROM sessions").get().count,
    0,
  );
  connection.close();
  assert.deepEqual(
    fs.readFileSync(path.join(dir, "vps-uploads", image.split("/").at(-1))),
    pixels,
  );
  console.log(
    "PASS: workerd + D1 + R2, admin/reader authentication, signup/login, rich text >40k, images, country filters, SSR article URLs, deduplicated analytics and CSRF. Local emulation does not prove Free plan CPU limits.",
  );
} finally {
  child.kill();
  await new Promise((r) =>
    child.exitCode !== null ? r() : child.once("exit", r),
  );
  assert.equal(path.dirname(path.resolve(dir)), path.resolve(tmpdir()));
  assert.ok(path.basename(dir).startsWith("once-cloudflare-"));
  fs.rmSync(dir, { recursive: true, force: true });
}
