# OrderFlow AIO — prototype

Sistem berpusat (All-in-One) untuk order management: tempahan, progress department, tracking customer, CRM, blast dan notifikasi automatik.

**Stack:** FastAPI · SQLite (SQLAlchemy) · vanilla JS + GSAP (vendored, tiada build step)

## Jalankan
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```
- `http://localhost:8000/` — public order tracking (customer masukkan Order ID)
- `http://localhost:8000/app` — dashboard staff/admin
- `http://localhost:8000/docs` — API docs

Data demo di-seed automatik pada run pertama (`orderflow.db`). Padam fail tu untuk reset.

## Fungsi vs requirement
| # | Requirement | Di mana |
|---|---|---|
| 1 | Order Management | `/app#/orders`, `POST /api/orders` |
| 2 | Staff Dashboard | `/app#/staff` — design / production / delivery update task masing-masing |
| 3 | Customer Order Tracking | `/` + `GET /api/track/{code}` (tak dedahkan phone/email) |
| 4 | Admin Dashboard | `/app#/admin` — KPI, status, prestasi department |
| 5 | Centralized DB | satu SQLite (`app/models.py`) |
| 6 | Customer Blasting | `/app#/blast` — WhatsApp/Email/SMS, **hanya customer yang consent** |
| 7 | Automated Notification | status order berubah → mesej direkod ikut channel consent (`app/notify.py`) |
| 8 | CRM | `/app#/customers` — segment auto (new/repeat/vip), tags, sejarah pembelian |

Status order dihitung automatik daripada task department
(`received → design → design_approved → in_production → ready_for_delivery → completed`).

## Belum ada (sengaja, untuk prototype)
- Login/auth sebenar — pemilih "login sebagai" di sidebar hanyalah demo.
- Gateway sebenar WhatsApp/Email/SMS — mesej cuma direkod dalam jadual `notifications`; sambung di `notify.dispatch()`.
- Migrasi DB (Alembic), ujian automatik, upload fail design.
