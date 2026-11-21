import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { startTestBackend } from "./test-backend.mjs";
const dir = await mkdtemp(path.join(tmpdir(), "once-test-"));
// A pre-i18n record proves existing posts are preserved and classified as Vietnamese.
const legacy = {
  id: "legacy-vi",
  title: "Bài viết cũ",
  excerpt: "Nội dung cũ",
  content: "Không thay đổi nội dung.",
  country: "FR",
  category: "Văn hóa",
  image: "",
  author: "Tester",
  published: true,
  date: "2026-11-01",
};
await writeFile(
  path.join(dir, "store.json"),
  JSON.stringify({ posts: [legacy], events: [] }),
);
const origin = "http://localhost:3100";
const password = randomBytes(24).toString("hex");
const testEnv = {
  ADMIN_USERNAME: "test@example.com",
  ADMIN_PASSWORD: password,
  SESSION_SECRET: randomBytes(32).toString("hex"),
  GOOGLE_CLIENT_ID: "smoke-client.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "smoke-secret",
  ADMIN_GOOGLE_EMAILS: "",
};
const backend = await startTestBackend({
  dir,
  origin,
  port: 4100,
  env: testEnv,
});
let server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3100"],
  { env: { ...backend.env }, stdio: ["ignore", "pipe", "pipe"] },
);
let output = "";
server.stdout.on("data", (d) => (output += d));
server.stderr.on("data", (d) => (output += d));
let cookie = "";
async function request(url, method = "GET", body, authenticated = false) {
  return fetch(origin + url, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(authenticated ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(origin)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, output);
  const root = await fetch(origin, {
    redirect: "manual",
    headers: { "Accept-Language": "vi" },
  });
  assert.equal(root.status, 307);
  assert.equal(root.headers.get("location"), "/en");
  const admin = await fetch(origin + "/admin", { redirect: "manual" });
  assert.equal(admin.status, 307);
  assert.equal(admin.headers.get("location"), "/en/admin");
  const editions = {
    en: "Stories worth reading",
    vi: "Câu chuyện đáng đọc",
    fr: "Des histoires à découvrir",
    de: "Lesenswerte Geschichten",
    es: "Historias para descubrir",
    it: "Storie da scoprire",
    pt: "Histórias para descobrir",
    nl: "Verhalen om te lezen",
    pl: "Historie warte przeczytania",
    "fr-BE": "Des histoires à découvrir",
    "nl-BE": "Verhalen om te lezen",
    "de-BE": "Lesenswerte Geschichten",
    da: "Historier, der er værd at læse",
    sv: "Berättelser värda att läsa",
  };
  for (const [language, heading] of Object.entries(editions)) {
    const response = await request("/" + language);
    assert.equal(response.status, 200);
    const html = await response.text();
    const uiLocale = language.endsWith("-BE") ? "fr-BE" : language;
    assert.ok(
      html.includes(`<html lang="${uiLocale}"`),
      `${language}: country-driven SSR document language`,
    );
    assert.ok(html.includes("Once Upon Today"));
    assert.ok(
      html.includes(editions[uiLocale]),
      `${language}: country-driven heading`,
    );
    assert.equal((await request(`/${language}/admin`)).status, 200);
  }
  const english = await (await request("/en")).text();
  assert.ok(english.includes(legacy.title));
  assert.ok(english.includes('href="/vi/posts/legacy-vi?country=all"'));
  assert.ok(!english.includes('class="intro"'));
  assert.ok(!english.includes('class="discovery"'));
  const vietnamese = await (await request("/vi?country=VN")).text();
  assert.ok(!vietnamese.includes(legacy.title));
  const french = await (await request("/fr?country=FR")).text();
  assert.ok(french.includes(legacy.title));
  assert.ok(french.includes('href="/vi/posts/legacy-vi?country=FR"'));
  const allArticle = await (
    await request("/vi/posts/legacy-vi?country=all")
  ).text();
  assert.ok(allArticle.includes('<html lang="en"'));
  assert.ok(allArticle.includes('lang="vi"'));
  assert.ok(allArticle.includes("Back to stories"));
  const frArticle = await (
    await request("/vi/posts/legacy-vi?country=FR")
  ).text();
  assert.ok(frArticle.includes('<html lang="fr"'));
  assert.ok(frArticle.includes('href="/fr?country=FR"'));
  const oldPost = (await (await request("/api/posts?language=vi")).json())
    .posts[0];
  assert.equal(oldPost.language, "vi");
  assert.equal(oldPost.content, legacy.content);
  assert.equal(oldPost.country, "FR");
  assert.deepEqual(
    (await (await request("/api/posts?language=en")).json()).posts,
    [],
  );
  const oldPage = await request("/vi/posts/legacy-vi");
  assert.equal(oldPage.status, 200);
  assert.ok((await oldPage.text()).includes(legacy.content));
  assert.equal((await request("/xx")).status, 404);
  assert.equal((await request("/en/posts/legacy-vi")).status, 404);
  assert.equal((await request("/api/posts?language=xx")).status, 400);
  assert.equal((await request("/api/stats")).status, 401);
  assert.equal((await request("/api/posts", "POST", {})).status, 401);
  assert.equal(
    (
      await request("/api/auth", "POST", {
        email: "test@example.com",
        password: "wrong",
      })
    ).status,
    401,
  );
  const login = await request("/api/auth", "POST", {
    email: "test@example.com",
    password,
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(login.headers.get("set-cookie"), /Secure/i);
  assert.equal(
    (await (await request("/api/auth", "GET", null, true)).json()).user.role,
    "admin",
  );
  const adminCookie = cookie;
  assert.equal(
    (
      await request("/api/auth/signup", "POST", {
        name: "Reader",
        email: "reader@example.com",
        password: "short",
      })
    ).status,
    400,
  );
  const readerPassword = randomBytes(18).toString("hex");
  const signup = await request("/api/auth/signup", "POST", {
    name: "Reader",
    email: " Reader@Example.com ",
    password: readerPassword,
    role: "admin",
  });
  // Email normalization also handles whitespace entered by visitors.
  assert.equal(signup.status, 201);
  cookie = signup.headers.get("set-cookie").split(";")[0];
  const reader = (await (await request("/api/auth", "GET", null, true)).json())
    .user;
  assert.equal(reader.role, "reader");
  assert.equal(reader.email, "reader@example.com");
  assert.ok(!("passwordHash" in reader));
  assert.equal((await request("/api/stats", "GET", null, true)).status, 401);
  assert.equal((await request("/api/posts", "POST", {}, true)).status, 401);
  assert.equal(
    (await request("/api/posts", "DELETE", { id: legacy.id }, true)).status,
    401,
  );
  assert.equal(
    (await request(`/api/posts/${legacy.id}`, "GET", null, true)).status,
    401,
  );
  assert.equal((await request("/api/uploads", "POST", {}, true)).status, 401);
  assert.equal(
    (
      await request("/api/auth/signup", "POST", {
        name: "Duplicate",
        email: "reader@example.com",
        password: readerPassword,
      })
    ).status,
    409,
  );
  const oldReaderCookie = cookie;
  assert.equal((await request("/api/auth", "DELETE", null, true)).status, 200);
  assert.equal(
    (await (await request("/api/auth", "GET", null, true)).json())
      .authenticated,
    false,
  );
  cookie = oldReaderCookie;
  assert.equal(
    (await (await request("/api/auth", "GET", null, true)).json())
      .authenticated,
    false,
  );
  assert.equal(
    (
      await request("/api/auth", "POST", {
        email: "reader@example.com",
        password: "wrong",
      })
    ).status,
    401,
  );
  const readerLogin = await request("/api/auth", "POST", {
    email: "READER@example.com",
    password: readerPassword,
  });
  assert.equal(readerLogin.status, 200);
  cookie = readerLogin.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await (await request("/api/auth", "GET", null, true)).json()).user.role,
    "reader",
  );
  const storedReader = backend.row("SELECT * FROM users WHERE id=?", reader.id);
  assert.match(storedReader.passwordHash, /^scrypt-v2:/);
  assert.ok(!JSON.stringify(storedReader).includes(readerPassword));
  const csrfSignup = await fetch(origin + "/api/auth/signup", {
    method: "POST",
    headers: {
      Origin: "https://other.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  assert.equal(csrfSignup.status, 403);
  const oauth = await request("/api/auth/google", "POST", {
    locale: "vi",
    returnTo: "https://other.example/steal",
  });
  assert.equal(oauth.status, 200);
  const oauthUrl = new URL((await oauth.json()).url),
    oauthCookie = oauth.headers.get("set-cookie").split(";")[0];
  assert.equal(oauthUrl.origin, "https://accounts.google.com");
  assert.equal(oauthUrl.searchParams.get("code_challenge_method"), "S256");
  assert.ok(oauthUrl.searchParams.get("nonce"));
  assert.equal(
    oauthUrl.searchParams.get("redirect_uri"),
    origin + "/api/auth/google/callback",
  );
  const badState = await fetch(
    origin + "/api/auth/google/callback?code=not-real&state=wrong",
    { headers: { Cookie: oauthCookie }, redirect: "manual" },
  );
  assert.equal(badState.status, 307);
  assert.equal(new URL(badState.headers.get("location")).origin, origin);
  assert.ok(badState.headers.get("location").includes("authError=oauthFailed"));
  const cancelled = await fetch(
    origin +
      "/api/auth/google/callback?error=access_denied&state=" +
      oauthUrl.searchParams.get("state"),
    { headers: { Cookie: oauthCookie }, redirect: "manual" },
  );
  assert.equal(cancelled.status, 307);
  assert.ok(
    cancelled.headers.get("location").includes("/vi?authError=oauthFailed"),
  );
  cookie = adminCookie;
  const draft = {
    title: "English smoke story",
    excerpt: "Test excerpt",
    content: "English content on a separate page.",
    author: "Tester",
    country: "JP",
    language: "en",
    category: "Văn hóa",
    image: "",
    published: false,
  };
  // New editions must work through the full publishing path, not just the selector.
  for (const language of ["fr-BE", "nl-BE", "de-BE", "da", "sv"]) {
    const response = await request(
      "/api/posts",
      "POST",
      {
        ...draft,
        title: `Edition ${language}`,
        language,
        country: language.endsWith("-BE")
          ? "BE"
          : language === "da"
            ? "DK"
            : "SE",
        published: true,
      },
      true,
    );
    assert.equal(response.status, 200);
    const { post: localized } = await response.json();
    const filtered = (
      await (await request(`/api/posts?language=${language}`)).json()
    ).posts;
    assert.ok(
      filtered.some((p) => p.id === localized.id && p.language === language),
    );
    const listing = await (await request(`/${language}`)).text();
    assert.ok(
      listing.includes(`href="/${language}/posts/${localized.id}?country=`),
    );
    const article = await request(`/${language}/posts/${localized.id}`);
    assert.equal(article.status, 200);
    assert.ok(
      (await article.text()).includes(
        `<html lang="${language.endsWith("-BE") ? "fr-BE" : language}"`,
      ),
    );
    const other = language.endsWith("-BE") ? language.split("-")[0] : "en";
    assert.ok(
      !(
        await (await request(`/api/posts?language=${other}`)).json()
      ).posts.some((p) => p.id === localized.id),
    );
    assert.equal(
      (await request(`/${other}/posts/${localized.id}`)).status,
      404,
    );
    assert.equal(
      (await request("/api/posts", "DELETE", { id: localized.id }, true))
        .status,
      200,
    );
  }
  assert.equal(
    (await request("/api/posts", "POST", { ...draft, language: "xx" }, true))
      .status,
    400,
  );
  const noLanguage = { ...draft };
  delete noLanguage.language;
  assert.equal(
    (await request("/api/posts", "POST", noLanguage, true)).status,
    400,
  );
  const create = await request("/api/posts", "POST", draft, true);
  assert.equal(create.status, 200);
  const { post } = await create.json();
  assert.ok(
    !(await (await request("/api/posts")).json()).posts.some(
      (p) => p.id === post.id,
    ),
  );
  assert.ok(
    (await (await request("/api/posts", "GET", null, true)).json()).posts.some(
      (p) => p.id === post.id,
    ),
  );
  assert.equal((await request(`/en/posts/${post.id}`)).status, 404);
  assert.equal(
    (await request(`/en/posts/${post.id}`, "GET", null, true)).status,
    404,
  );
  assert.equal(
    (await request("/api/posts", "POST", { ...post, published: true }, true))
      .status,
    200,
  );
  assert.ok(
    (await (await request("/api/posts?language=en")).json()).posts.some(
      (p) => p.id === post.id && p.country === "JP" && p.language === "en",
    ),
  );
  assert.ok(
    !(await (await request("/api/posts?language=vi")).json()).posts.some(
      (p) => p.id === post.id,
    ),
  );
  const homeHtml = await (await request("/en")).text();
  assert.ok(homeHtml.includes(`href="/en/posts/${post.id}?country=all"`));
  assert.ok(homeHtml.includes(post.title));
  assert.ok(!homeHtml.includes('role="dialog"'));
  const jpListing = await (await request("/en?country=JP")).text();
  assert.ok(jpListing.includes(post.title));
  assert.ok(!jpListing.includes(legacy.title));
  const otherLanguage = await request(
    "/api/posts",
    "POST",
    {
      ...draft,
      id: undefined,
      title: "An English story in France",
      country: "FR",
      published: true,
    },
    true,
  );
  assert.equal(otherLanguage.status, 200);
  const { post: frEnglish } = await otherLanguage.json();
  const frenchMixed = await (await request("/fr?country=FR")).text();
  assert.ok(frenchMixed.includes(legacy.title));
  assert.ok(frenchMixed.includes(frEnglish.title));
  assert.ok(!frenchMixed.includes(post.title));
  const invalidCountry = await (await request("/vi?country=INVALID")).text();
  assert.ok(invalidCountry.includes('<html lang="en"'));
  assert.ok(invalidCountry.includes(legacy.title));
  await request("/api/posts", "DELETE", { id: frEnglish.id }, true);
  const article = await request(`/en/posts/${post.id}`);
  assert.equal(article.status, 200);
  const articleHtml = await article.text();
  assert.ok(articleHtml.includes(post.content));
  assert.ok(
    articleHtml.includes(`<title>${post.title} | Once Upon Today</title>`),
  );
  assert.ok(!articleHtml.includes('role="dialog"'));
  assert.equal((await request(`/vi/posts/${post.id}`)).status, 404);
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await request("/api/events", "POST", {
          visitor: "smoke-visitor",
          type: "view",
          postId: post.id,
        })
      ).status,
      200,
    );
  await request("/api/events", "POST", {
    visitor: "smoke-visitor",
    type: "like",
    postId: post.id,
  });
  const stats = await (await request("/api/stats", "GET", null, true)).json();
  assert.equal(stats.views, 1);
  assert.equal(stats.users, 1);
  assert.equal(stats.likes, 1);
  assert.equal(
    (
      await request(
        "/api/posts",
        "POST",
        { ...post, published: true, language: "fr" },
        true,
      )
    ).status,
    200,
  );
  assert.equal((await request(`/en/posts/${post.id}`)).status, 404);
  assert.equal((await request(`/fr/posts/${post.id}`)).status, 200);
  assert.ok(
    !(await (await request("/api/posts?language=en")).json()).posts.some(
      (p) => p.id === post.id,
    ),
  );
  assert.ok(
    (await (await request("/api/posts?language=fr")).json()).posts.some(
      (p) => p.id === post.id,
    ),
  );
  const csrf = await fetch(origin + "/api/posts", {
    method: "DELETE",
    headers: {
      Origin: "https://other.example",
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: post.id }),
  });
  assert.equal(csrf.status, 403);
  assert.equal(
    (await request("/api/posts", "DELETE", { id: post.id }, true)).status,
    200,
  );
  assert.equal((await request(`/fr/posts/${post.id}`)).status, 404);
  const migrated = backend.row("SELECT * FROM posts WHERE id=?", legacy.id);
  assert.equal(migrated.language, "vi");
  assert.equal(migrated.content, legacy.content);
  // Test long rich text, server sanitation, persistence and real image decoding.
  const pixels = await sharp({
    create: { width: 12, height: 8, channels: 3, background: "#2c6653" },
  })
    .png()
    .toBuffer();
  const uploadData = new FormData();
  uploadData.set(
    "file",
    new Blob([pixels], { type: "image/png" }),
    "fixture.png",
  );
  const upload = await fetch(origin + "/api/uploads", {
    method: "POST",
    headers: { Origin: origin, Cookie: cookie },
    body: uploadData,
  });
  assert.equal(upload.status, 201);
  const image = await upload.json();
  assert.match(image.url, /^\/api\/uploads\/[a-f0-9-]{36}\.(png|webp)$/);
  const served = await fetch(origin + image.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.equal(
    (await sharp(Buffer.from(await served.arrayBuffer())).metadata()).width,
    12,
  );
  const fakeData = new FormData();
  fakeData.set(
    "file",
    new Blob(["not a real image"], { type: "image/png" }),
    "fake.png",
  );
  assert.equal(
    (
      await fetch(origin + "/api/uploads", {
        method: "POST",
        headers: { Origin: origin, Cookie: cookie },
        body: fakeData,
      })
    ).status,
    400,
  );
  const svgData = new FormData();
  svgData.set(
    "file",
    new Blob(['<svg onload="alert(1)"></svg>'], { type: "image/svg+xml" }),
    "bad.svg",
  );
  assert.equal(
    (
      await fetch(origin + "/api/uploads", {
        method: "POST",
        headers: { Origin: origin, Cookie: cookie },
        body: svgData,
      })
    ).status,
    400,
  );
  const largeData = new FormData();
  largeData.set(
    "file",
    new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" }),
    "too-big.png",
  );
  assert.equal(
    (
      await fetch(origin + "/api/uploads", {
        method: "POST",
        headers: { Origin: origin, Cookie: cookie },
        body: largeData,
      })
    ).status,
    413,
  );
  const uploadCsrf = await fetch(origin + "/api/uploads", {
    method: "POST",
    headers: { Origin: "https://other.example", Cookie: cookie },
    body: uploadData,
  });
  assert.equal(uploadCsrf.status, 403);
  const richText = "A meaningful paragraph. ".repeat(1800);
  const html = `<h2>Rich heading</h2><p><strong>Bold words</strong> <em>Italic words</em></p><ul><li>First item</li></ul><p>${richText}</p><img src="${image.url}" alt="Uploaded content"><script>alert('bad')</script><p onclick="alert(1)">Safe text</p><a href="javascript:alert(1)">Bad link</a><img src="data:image/svg+xml,bad" onerror="alert(1)">`;
  const richResponse = await request(
    "/api/posts",
    "POST",
    {
      ...draft,
      title: "Rich text over 30k",
      author: undefined,
      content: html,
      contentFormat: "html",
      image: image.url,
      published: false,
    },
    true,
  );
  assert.equal(richResponse.status, 200);
  const rich = (await richResponse.json()).post;
  assert.ok(rich.content.length > 30000);
  assert.equal(rich.author, "Once Upon Today");
  assert.equal(rich.contentFormat, "html");
  assert.ok(rich.content.includes("<strong>Bold words</strong>"));
  assert.ok(rich.content.includes(image.url));
  assert.ok(
    !/<script|onclick|onerror|javascript:|data:image/i.test(rich.content),
  );
  const roundTrip = (
    await (await request(`/api/posts/${rich.id}`, "GET", null, true)).json()
  ).post;
  assert.equal(roundTrip.content, rich.content);
  assert.equal((await request(`/en/posts/${rich.id}`)).status, 404);
  assert.equal(
    (
      await request(
        "/api/posts",
        "POST",
        {
          ...rich,
          content: rich.content + "<p>Edited ending</p>",
          published: true,
        },
        true,
      )
    ).status,
    200,
  );
  const richPage = await (await request(`/en/posts/${rich.id}`)).text();
  assert.ok(richPage.includes("<h2>Rich heading</h2>"));
  assert.ok(richPage.includes("<strong>Bold words</strong>"));
  assert.ok(richPage.includes("Edited ending"));
  assert.equal(
    (
      await request(
        "/api/posts",
        "POST",
        { ...rich, content: "x".repeat(500001) },
        true,
      )
    ).status,
    400,
  );
  const legacyAfter = await (
    await request("/vi/posts/legacy-vi?country=all")
  ).text();
  assert.ok(legacyAfter.includes(legacy.content));
  assert.equal(
    (await request("/api/posts", "DELETE", { id: rich.id }, true)).status,
    200,
  );
  assert.equal((await request("/api/auth", "DELETE", null, true)).status, 200);
  const health = await (await request("/api/health")).json();
  assert.equal(health.database, "sqlite");
  const source = JSON.parse(
    await readFile(path.join(dir, "store.json"), "utf8"),
  );
  assert.equal(source.posts.length, 1);
  assert.equal(source.posts[0].language, undefined);
  assert.equal((await request("/vi/posts/legacy-vi?country=all")).status, 200);
  assert.equal(backend.row("SELECT COUNT(*) AS count FROM users").count, 1);
  server.kill();
  await new Promise((resolve) =>
    server.exitCode !== null ? resolve() : server.once("exit", resolve),
  );
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", "3100"],
    { env: { ...backend.env }, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (d) => (output += d));
  server.stderr.on("data", (d) => (output += d));
  let restarted = false;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await request("/api/health")).ok) {
        restarted = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(restarted, output);
  const relogin = await request("/api/auth", "POST", {
    email: "reader@example.com",
    password: readerPassword,
  });
  assert.equal(relogin.status, 200);
  await backend.migrate();
  assert.equal(backend.row("SELECT COUNT(*) AS count FROM users").count, 1);
  assert.equal(backend.row("SELECT COUNT(*) AS count FROM posts").count, 1);
  assert.equal(
    (await (await request("/api/health")).json()).database,
    "sqlite",
  );
  console.log(
    "PASS: Next.js API + SQLite, persistence after process restart, idempotent legacy import, preserved JSON, authentication, roles, rich text >40k, image uploads, country filters, CRUD and analytics.",
  );
} finally {
  server.kill();
  await new Promise((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once("exit", resolve);
  });
  await backend.stop();
  assert.equal(path.dirname(path.resolve(dir)), path.resolve(tmpdir()));
  assert.ok(path.basename(dir).startsWith("once-test-"));
  await rm(dir, { recursive: true, force: true });
}
