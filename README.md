# OrderFlow AIO — prototype

Sistem berpusat (All-in-One) untuk order management: tempahan, progress department, tracking customer, CRM, blast dan notifikasi automatik.

**Stack:** FastAPI · SQLite (SQLAlchemy 2) · vanilla JS + GSAP (vendored, tiada build step).
UI mobile-first dengan glassmorphism, palet OpenKuasa (emerald / teal / rose ikut modul), light & dark.

## Jalankan
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```
- `http://localhost:8000/` — public order tracking
- `http://localhost:8000/app` — dashboard staff/admin (tekan avatar untuk tukar staff demo)
- `http://localhost:8000/docs` — API docs

Data demo di-seed pada run pertama (`orderflow.db`). Skema berubah dari v0.1 — padam `orderflow.db` lama.

## Test
```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

## Struktur (OOP)
```
app/
  domain/
    enums.py      OrderStatus, Department, Role, TaskState, Channel, Segment
    models.py     Entity + behaviour: Customer, Tag, ConsentRecord, Staff, Order, OrderTask,
                  StatusLog, Campaign, Notification(StatusNotification, CampaignNotification),
                  SegmentPolicy, StatusChange
    errors.py     DomainError -> NotFound / InvalidOperation
  services/
    notifiers.py  Notifier (abstract) -> WhatsAppNotifier, EmailNotifier, SmsNotifier; NotificationCenter
    services.py   Repository base, OrderService, CustomerService, CampaignService,
                  StaffService, NotificationService, ReportService, OrderCodeGenerator
  routers/        orders, customers, outreach, admin  (HTTP sahaja, tiada logic)
  schemas.py      Input validation + output shaping
  deps.py         Wiring service ke FastAPI
```

Aliran: **router → service → entity method → service simpan + hantar notifikasi**.
Contoh: `OrderService.update_task()` panggil `Order.update_task()`, yang semak
`Staff.can_work_on()`, kira status baru melalui `Order.STATUS_RULES` dan pulangkan `StatusChange`.
Service kemudian serahkan `StatusChange` kepada `NotificationCenter`, yang pilih `Notifier` ikut consent customer.

### ERD
```
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

## Belum ada (sengaja, untuk prototype)
- Login/auth sebenar — pilihan staff hanyalah demo.
- Gateway sebenar WhatsApp/Email/SMS — isi `deliver()` dalam subclass `Notifier`.
- Migrasi DB (Alembic), upload fail design.
