# Cloudflare và chuyển hosting

## Cấu trúc để có thể chuyển đi

| Thành phần | Cloudflare                   | VPS / máy local        |
| ---------- | ---------------------------- | ---------------------- |
| Web và API | Next.js qua OpenNext Workers | Next.js Node server    |
| Database   | D1 binding `DB`              | SQLite `DATABASE_PATH` |
| Ảnh        | R2 binding `MEDIA`           | thư mục `UPLOAD_DIR`   |
| Schema     | `database/migrations/*.sql`  | cùng migration SQL     |

`server/api.ts` xử lý HTTP; `server/security.ts` xử lý tài khoản/session; `server/repository.ts` sử dụng SQL có tham số. Chỉ `server/platform/` biết D1, R2, SQLite hay filesystem. Adapter được chọn lúc build qua `DEPLOY_TARGET=cloudflare`; build thông thường chọn Node. Không dùng D1 trong components và không lưu URL bucket R2 trong bài viết. URL ảnh `/api/uploads/<uuid>.<extension>` giữ nguyên khi chuyển máy chủ.

`backend/` là bản NestJS lưu lại để đối chiếu, không cần chạy hoặc cài dependencies của nó nữa. `npm run db:import` ưu tiên sao chép SQLite hiện có bằng SQLite backup API, giữ nguyên bản gốc; nếu chưa có database thì nhập JSON cũ hoặc seed. Lệnh có thể chạy lại, không ghi đè bài đã có. Tài khoản scrypt cũ vẫn đăng nhập được. Sessions không nằm trong bundle migration, nên khách cần đăng nhập lại sau khi chuyển host.

## Cloudflare

Yêu cầu Node 22.12+ và npm. Trên Windows nên dùng WSL/Linux hoặc CI Linux cho production build, theo khuyến cáo của OpenNext. Bản build hiện cũng được kiểm tra trên Windows.

1. Chạy `npm ci`, sau đó đăng nhập bằng `npx wrangler login` trên máy của mình. Không đưa token vào repo hoặc chat.
2. Tạo tài nguyên:

   ```sh
   npx wrangler d1 create once-upon-today
   npx wrangler r2 bucket create once-upon-today-media
   ```

3. Điền `database_id` nhận được vào `wrangler.jsonc`. Đổi `vars.APP_URL` thành `https://ten-mien-cua-ban`. Giữ D1 database và R2 bucket ở tài khoản dự định sử dụng lâu dài. Bucket dùng Standard, không bật dịch vụ Images/AI hoặc tính năng trả phí cho app này.
4. Tạo schema: `npm run db:migrate:cloudflare`.
5. Khai báo secrets bằng prompt của CLI, không truyền giá trị vào command history:

   ```sh
   npx wrangler secret put ADMIN_USERNAME
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET
   # Khi dùng Google:
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put ADMIN_GOOGLE_EMAILS
   ```

   `SESSION_SECRET` phải ngẫu nhiên, ít nhất 32 ký tự. Không có mật khẩu admin mặc định. Người đăng ký mới là reader. Chỉ email Google đã xác minh, được liệt kê trong `ADMIN_GOOGLE_EMAILS`, mới có quyền admin Google. Đăng ký callback chính xác `https://ten-mien-cua-ban/api/auth/google/callback` trong Google Cloud Console.

6. Đưa dữ liệu hiện tại lên:

   ```sh
   npm run db:import
   npm run backup -- local backups/before-cloudflare
   npm run restore -- cloudflare backups/before-cloudflare
   ```

   Destination phải trống. Không chạy `db:import` để seed vào database đích trước khi restore. Lệnh restore không xóa dữ liệu cũ; nếu destination có dữ liệu sẽ dừng. Nếu đã có dữ liệu cần giữ trên Cloudflare, export trước và tạo database/bucket mới cho đợt chuyển này.

7. Build và deploy:

   ```sh
   npm run build:cloudflare
   npm run deploy:cloudflare
   ```

   Script loại bỏ biến private đọc từ `.env*` khỏi file môi trường của OpenNext trước khi deploy và kiểm tra output. Chỉ `NEXT_PUBLIC_*` được giữ ở build time; thông tin đăng nhập production phải nằm trong Workers secrets. Không deploy trực tiếp artifact cũ bằng lệnh bỏ qua script. Khi thay AdSense client/slot, build lại.

8. Workers & Pages → Worker `once-upon-today` → Settings → Domains & Routes → Add → Custom Domain, nhập domain. Domain đã mua trên Cloudflare vẫn cần bước gắn vào Worker. Có thể cấu hình `routes` với `custom_domain: true` trong Wrangler khi đã chốt domain. Với `www`, chọn một canonical origin phù hợp `APP_URL`, rồi redirect hostname còn lại.
9. Kiểm tra `/api/health` trả `database: d1`, đọc một bài trên URL riêng, đăng nhập admin, đăng ký reader, đăng bài nháp, upload ảnh, sửa/publish, country filter và biểu đồ. Google OAuth cần kiểm tra bằng tài khoản thật. Xem CPU/error metrics và kiểm tra không lộ draft qua API public trước khi mở traffic.

Cloudflare không được tự động deploy trong bước sửa mã này: repo chưa có Account/D1 ID/domain production hoặc phiên đăng nhập Cloudflare được xác nhận. `wrangler.jsonc` đang giữ placeholder và script chặn deploy khi chưa cấu hình.

## Chạy giả lập Workers

```sh
npm run build:cloudflare
npx wrangler d1 migrations apply DB --local
# Tạo .dev.vars với các secret TEST; APP_URL=http://localhost:8787
npm run preview:cloudflare
```

`npm run test:cloudflare` tự tạo D1/R2, cấu hình và tài khoản tạm, chạy `workerd` thật; không dùng database production. Test gồm đăng nhập/signup, phân quyền, CRUD rich text, ảnh R2, SSR và analytics. Nó còn export D1/R2 và restore sang SQLite/filesystem để kiểm tra dữ liệu chuyển được. Đây là giả lập local, không xác nhận hạn mức CPU hoặc OAuth của tài khoản production.

## Chuyển Cloudflare sang VPS

1. Tạm dừng ghi bằng Workers variable `READ_ONLY=true` (hoặc dừng app ở host nguồn). Chờ các request ghi đang chạy kết thúc. Export D1 và R2 là nhiều request, cần dừng ghi để bundle nhất quán. Giữ nguyên host cũ cho đến khi xác minh xong.
2. Export trên máy tin cậy đã đăng nhập Wrangler:

   ```sh
   npm run backup -- cloudflare backups/from-cloudflare
   ```

   Bundle gồm `data.json` (version, posts/users/events/uploads/import markers) và `media/` với SHA-256 từng ảnh. Có email và password hashes, phải giữ kín và sao lưu ngoài máy. Không commit bundle. Lệnh export không ghi đè thư mục backup có sẵn. R2 keys giữ nguyên. External HTTPS images không được tải về; chúng vẫn phụ thuộc nhà cung cấp ảnh đó.

3. Trên VPS mới: cài Node 22, `npm ci`, tạo `.env.local` với `APP_URL` HTTPS, admin/Google secrets, `DATABASE_PATH=data/app.sqlite`, `UPLOAD_DIR=data/uploads`. Khôi phục vào database mới, chưa seed:

   ```sh
   npm run restore -- local backups/from-cloudflare
   npm run build
   npm start
   ```

4. Đặt Nginx/Caddy làm reverse proxy HTTPS tới port 3000; chỉ mở Node ở localhost hoặc private network. Firewall không cho truy cập trực tiếp Node qua Internet. Proxy phải ghi đè `X-Forwarded-For` bằng IP client tin cậy để rate limit hoạt động đúng; không chuyển header tùy ý từ client. Mount/persist toàn bộ thư mục `data/`, gồm database, WAL và uploads. Không copy riêng file SQLite đang được ghi; dùng lệnh backup hoặc dừng app trước.
5. Đối chiếu số bài/tài khoản/events/ảnh, đọc và sửa bài, đăng nhập reader cũ, kiểm tra ảnh cover/inline. Khi đã đúng mới đổi DNS. Nếu giữ domain và callback thì Google không cần đổi URI; nếu đổi domain phải cập nhật `APP_URL` và Google Console. `READ_ONLY=false` ở host mới; host cũ tiếp tục read-only trong khoảng rollback.

Chiều ngược lại dùng cùng bundle: `backup -- local <folder>` → migrate schema D1 trống → `restore -- cloudflare <folder>`. Chuyển VPS sang VPS dùng `local` ở cả hai đầu. Mỗi lần đổi schema cần thêm migration mới, không sửa migration đã áp dụng. Các migration hiện tại chạy lại an toàn; script restore tự tạo schema local. Backup hiện tải các bảng vào RAM và dùng CLI cho từng ảnh, phù hợp blog nhỏ/vừa; dữ liệu lớn cần export có phân trang/stream hoặc công cụ DB riêng.

Nếu restore D1 bị ngắt giữa chừng, giữ bundle gốc và tạo database đích mới để thử lại; không giả định import remote luôn rollback toàn bộ. Nếu chưa chuyển DNS thì app nguồn vẫn là nơi lưu dữ liệu chính.

## VPS bằng Docker

`Dockerfile` build bản Next standalone; `compose.yaml` mount volume `once-data` vào `/app/data`. Cấu hình `.env.local` trước rồi `docker compose up -d --build`. App chỉ bind port host `127.0.0.1:3000`; TLS do reverse proxy xử lý. Chưa có Docker engine được dùng để kiểm thử image trong workspace này.

Để đưa bundle vào container mới: `docker compose cp backups/from-cloudflare app:/app/backups/import`, rồi `docker compose exec app node scripts/transfer.mjs import local /app/backups/import`. Chưa mở traffic hoặc seed trước khi restore. Container runtime có công cụ transfer local; backup/restore Cloudflare chạy từ checkout đầy đủ có Wrangler. Không dùng `docker compose down -v` khi cần giữ dữ liệu.

## Giới hạn miễn phí

Mục tiêu là dùng Workers Free + D1 + R2 trong quota, không cam kết chi phí luôn bằng 0. Workers Free có giới hạn request và CPU; password hashing an toàn và SSR có thể chạm CPU limit. App giữ scrypt đủ mạnh, không giảm độ an toàn để ép vào quota. Google OAuth giảm nhu cầu hash password nhưng vẫn cần đo CPU thực tế. Cần kiểm tra sau deploy; nếu gặp lỗi 1102, phải tối ưu/cache thêm, dùng dịch vụ auth phù hợp hoặc chuyển VPS/gói Workers trả phí theo quyết định của chủ app.

R2 có free allowance nhưng có thể yêu cầu bật R2/billing; khi vượt allowance có thể phát sinh phí theo cấu hình tài khoản. Không tự đăng ký gói trả phí trong mã. Theo dõi Usage/Billing và hạn mức trước khi mở traffic. Tài liệu chính thức: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [OpenNext deploy](https://opennext.js.org/cloudflare/get-started).
