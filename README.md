# Semarang Flood Dashboard (Prototype)

Stack:
- Next.js (App Router) + Tailwind
- MySQL 8 (Docker)
- Ingest scripts: BMKG forecast + PantauBanjir Semarang (scrape)

## 1) Prasyarat
- Node.js **18+**
- Docker Desktop (atau Docker Engine)
- (Opsional) DBeaver untuk lihat DB

## 2) Setup cepat (biar langsung jalan)
### A. Jalankan MySQL
```bash
docker compose up -d
```

### B. Setup env
Copy `.env.local.example` → `.env.local` lalu pastiin:
```env
DATABASE_URL="mysql://root:root@localhost:3308/flooddb"
JWT_SECRET="random_panjang"
```

### C. Install dependency
```bash
npm install
```

### D. Buat tabel + seed data dummy
```bash
npm run db:init
npm run db:seed
```

### E. Jalankan web
```bash
npm run dev
```

Buka:
- http://localhost:3000/login

Login demo:
- email: `admin@semarang.go.id`
- pass: `admin123`

## 3) Ingest data "real"
> Ini optional. Kalau cuma mau demo, seed dummy udah cukup.

### A. Cuaca BMKG (butuh `areas.adm4_code`)
Seed sudah punya 1 contoh adm4. Untuk nambah wilayah:
- Tambahkan baris di tabel `areas` dengan `adm4_code`
- Lalu jalankan:
```bash
npm run ingest:bmkg
```

### B. TMA PantauBanjir Semarang
```bash
npm run ingest:tma
```

## 4) Catatan penting
- Proteksi login ini masih prototype (client-side token). Untuk produksi: pakai middleware + httpOnly cookie.
- Scraper PantauBanjir pakai pattern text; kalau struktur situs berubah, parser perlu disesuaikan.

## 5) Struktur folder
- `app/` : UI pages + API routes
- `components/` : CCTV player & Map
- `scripts/` : init DB, seed, ingest BMKG & PantauBanjir
- `db/schema.sql` : schema MySQL
