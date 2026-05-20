# PinSearch — Pinterest Image Search Website

Website pencarian gambar Pinterest dengan backend Node.js sebagai proxy API.

## 📁 Struktur Project

```
pinterest-search/
├── public/
│   └── index.html        ← Frontend UI
├── pinterest.js          ← Logic scraping Pinterest
├── server.js             ← Express server + API route
├── vercel.json           ← Konfigurasi deploy Vercel
├── package.json
└── README.md
```

---

## 🚀 Jalankan di VPS / Lokal

### 1. Install dependensi
```bash
npm install
```

### 2. Jalankan server
```bash
npm start          # produksi
npm run dev        # development (auto-reload)
```

Buka browser: `http://localhost:3000`

### 3. Gunakan PM2 (agar tetap berjalan di VPS)
```bash
npm install -g pm2
pm2 start server.js --name pinsearch
pm2 save && pm2 startup
```

### 4. Nginx Reverse Proxy (opsional)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## ☁️ Deploy ke Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 🔌 API

### GET `/api/search`

| Parameter | Wajib | Keterangan |
|-----------|-------|------------|
| `q`       | ✅    | Kata kunci pencarian |
| `limit`   | ❌    | Jumlah gambar (default: 25, max: 100) |

**Contoh request:**
```
GET /api/search?q=aesthetic+room&limit=30
```

**Contoh response:**
```json
{
  "success": true,
  "query": "aesthetic room",
  "count": 30,
  "images": [
    {
      "url": "https://i.pinimg.com/736x/...",
      "title": "Aesthetic Room Ideas",
      "description": "...",
      "pinUrl": "https://www.pinterest.com/pin/123456/"
    }
  ]
}
```

---

## ⚠️ Catatan

- Hanya untuk penggunaan pribadi / edukasi
- Pinterest dapat mengubah struktur API-nya kapan saja
