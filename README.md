# OrderFlow AIO — prototype

Sistem berpusat (All-in-One) untuk order management: tempahan, progress department, tracking customer, CRM, blast dan notifikasi automatik.

**Stack:** FastAPI · SQLite (SQLAlchemy 2) · vanilla JS + GSAP (vendored, tiada build step).
UI mobile-first dengan glassmorphism, palet OpenKuasa (emerald / teal / rose ikut modul), light & dark.

## Jalankan
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```
- `http://localhost:8000/` — public order tracking (customer masukkan Order ID)
- `http://localhost:8000/app` — sistem staff (login)
- `http://localhost:8000/c/<token>` — customer urus consent sendiri (link dihantar dalam setiap promosi)
- `http://localhost:8000/docs` — API docs

Mod demo (default `DEMO=1`) seed 5 staff, 8 customer dan ~30 order sepanjang 8 minggu. Semua akaun demo guna password `demo1234`:

| Username | Role | Boleh |
|---|---|---|
| `boss` | Admin | Semua: dashboard, blast, team, import/export |
| `mira` | Sales / CS | Cipta & edit order, customers, import/export, notifikasi |
| `aina` / `hafiz` / `zul` | Design / Production / Delivery | Lihat order, update kerja department sendiri |

Skema DB berubah antara versi prototype — padam `orderflow.db` lama sebelum run.

### Production / Docker
```bash
cp .env.example .env   # isi SECRET_KEY, BASE_URL, ADMIN_PASSWORD, gateway
docker build -t orderflow .
docker run -d -p 8000:8000 --env-file .env -v orderflow-data:/data orderflow
```
Dengan `DEMO=0`, admin pertama dicipta daripada `ADMIN_USERNAME`/`ADMIN_PASSWORD`; staff lain ditambah di page **Team**.
Letak di belakang HTTPS (cth. Caddy / Nginx / Cloudflare) dan set `SECURE_COOKIES=1`.

### Gateway mesej
Setiap channel aktif bila env-nya diisi; jika tidak, mesej direkod sebagai **Simulasi** (status di page Notifikasi & dashboard).

| Channel | Env | Nota |
|---|---|---|
| WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | Meta WhatsApp Cloud API. Mesej pertama kepada customer di luar tetingkap 24 jam perlukan **template yang diluluskan Meta** — tukar `WhatsAppCloudNotifier` kepada mesej template sebelum go-live. |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | SMTP + STARTTLS (Gmail Workspace, SES, Brevo, dll.) |
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Twilio. Gateway tempatan boleh ditambah sebagai subclass `Notifier` baru. |

Mesej masuk **outbox** (`queued`) dan dihantar selepas response; gagal dicuba semula sehingga 3 kali, dan boleh dicuba semula dari page Notifikasi. No. telefon Malaysia dinormalkan ke `+60…`.

### Ganti Google Sheets
- **Import customers:** Customers → Import → CSV (column `name`, `phone`, `email`, `tags`, `notes`, `consent_whatsapp/email/sms`). Dipadankan ikut phone/email, jadi boleh import berulang kali.
- **Export:** Orders → CSV, Customers → CSV.

## Test
```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

## Struktur (OOP)
```
app/
  domain/
    enums.py      OrderStatus, Department, Role (+ permissions), Permission, TaskState, Channel, Segment
    models.py     Entity + behaviour: Customer, Tag, ConsentRecord, Staff, Order, OrderTask,
                  StatusLog, Campaign, Notification(StatusNotification, CampaignNotification),
                  SegmentPolicy, StatusChange
    errors.py     DomainError -> NotFound / InvalidOperation
  services/
    notifiers.py  Notifier (abstract) -> WhatsAppCloudNotifier, SmtpEmailNotifier, TwilioSmsNotifier,
                  SimulatedNotifier; NotificationCenter (siapa dapat apa), Dispatcher (hantar outbox)
    services.py   Repository base, OrderService, CustomerService, CampaignService,
                  StaffService, NotificationService, ReportService, OrderCodeGenerator
    auth.py       SessionSigner (HMAC cookie), AuthService
  routers/        auth, orders, customers, outreach, admin  (HTTP + permission sahaja)
  schemas.py      Input validation + output shaping
  config.py       Settings dari env
  deps.py         Wiring service + `require(Permission)` untuk FastAPI
```

Aliran: **router → service → entity method → service simpan + hantar notifikasi**.
Contoh: `OrderService.update_task()` panggil `Order.update_task()`, yang semak
`Staff.can_work_on()`, kira status baru melalui `Order.STATUS_RULES` dan pulangkan `StatusChange`.
Service kemudian serahkan `StatusChange` kepada `NotificationCenter`, yang queue mesej ikut consent customer;
`Dispatcher` hantar selepas response melalui `Notifier` yang dikonfigurasi.

### ERD
```
Staff (username, password_hash, role, active)

Customer 1──< Order 1──< OrderTask >──0..1 Staff
   │  │          │ 1
   │  │          └──< StatusLog >──0..1 Staff
   │  ├──< ConsentRecord          (sejarah consent, append-only)
   │  └──>──< Tag                 (M:N melalui customer_tags)
   └──< Notification ─┬─ StatusNotification   >──0..1 Order
                      └─ CampaignNotification >──0..1 Campaign
```

## Fungsi vs requirement
| # | Requirement | Di mana |
|---|---|---|
| 1 | Order Management | `#/orders`, `OrderService` |
| 2 | Staff Dashboard | `#/staff` — staff hanya boleh update department sendiri (admin boleh semua) |
| 3 | Customer Order Tracking | `/` + `GET /api/track/{code}` (tiada phone/email) |
| 4 | Admin Dashboard | `#/dashboard`, `ReportService` |
| 5 | Centralized DB | satu SQLite, entiti di `app/domain/models.py` |
| 6 | Customer Blasting | `#/blast`, `CampaignService` — hanya customer yang consent |
| 7 | Automated Notification | `NotificationCenter` + subclass `Notifier` |
| 8 | CRM | `#/customers` — segment (`SegmentPolicy`), tags, sejarah belian, rekod consent |

## Had PoC (sebelum production)
- SQLite + `create_all`: cukup untuk satu server; untuk berbilang server tukar ke PostgreSQL (`DATABASE_URL`) dan tambah Alembic.
- Outbox dihantar dalam proses web (background task); volum besar perlukan worker berasingan.
- WhatsApp template message (lihat jadual gateway), upload fail design, dan audit log penuh belum dibuat.
