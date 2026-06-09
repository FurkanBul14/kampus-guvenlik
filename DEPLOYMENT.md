# Online Deploy Rehberi
## MongoDB Atlas + Railway (Backend) + Vercel (Frontend)

---

## Adım 1 — MongoDB Atlas (Ücretsiz Bulut Veritabanı)

1. https://cloud.mongodb.com → Kayıt ol (Google ile olur)
2. **"Build a Database"** → **Free (M0)** seç → Region: **Frankfurt** (Europe)
3. Cluster adı: `campus-safety`
4. **Database Access** → Add User:
   - Username: `campusadmin`
   - Password: Güçlü bir şifre yaz (kopyala — lazım olacak)
   - Role: **Atlas admin**
5. **Network Access** → Add IP → **Allow Access from Anywhere** (`0.0.0.0/0`)
6. Cluster sayfasına dön → **Connect** → **Drivers** → Connection string kopyala:
   ```
   mongodb+srv://campusadmin:<password>@campus-safety.xxxxx.mongodb.net/campus_safety
   ```
   `<password>` yerine gerçek şifreyi yaz → bu senin `MONGODB_URI`

---

## Adım 2 — GitHub'a Yükle

```bash
cd campus-safety-platform

git init
git add .
git commit -m "Initial commit — Campus Safety Platform"
```

GitHub'da yeni repo aç (campus-safety-platform) → sonra:
```bash
git remote add origin https://github.com/KULLANICI_ADIN/campus-safety-platform.git
git push -u origin main
```

---

## Adım 3 — Railway (Backend Deploy)

1. https://railway.app → GitHub ile giriş yap
2. **New Project** → **Deploy from GitHub repo**
3. Repoyu seç → **backend** klasörünü root olarak seç (Root Directory: `backend`)
4. **Variables** sekmesine tıkla → şu env variable'ları ekle:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://campusadmin:SIFREN@cluster0.xxx.mongodb.net/campus_safety` |
| `JWT_SECRET` | `btu-campus-safety-gizli-anahtar-2024-xxx` |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://campus-safety-BTU.vercel.app` *(Vercel deploy sonrası güncelle)* |

5. Deploy otomatik başlar → **Logs** sekmesinde takip et
6. Deploy bitince URL'i kopyala: `https://campus-safety-xxx.railway.app`

---

## Adım 4 — Vercel (Frontend Deploy)

1. https://vercel.com → GitHub ile giriş yap
2. **New Project** → Repoyu seç → **Root Directory: `frontend`**
3. Framework: **Vite** (otomatik algılar)
4. **Environment Variables** ekle:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://campus-safety-xxx.railway.app` *(Railway URL)* |

5. **Deploy** → Birkaç dakika bekle
6. Vercel URL'ini al: `https://campus-safety-btu.vercel.app`

---

## Adım 5 — Railway'de CLIENT_URL Güncelle

Railway → Variables → `CLIENT_URL` = `https://campus-safety-btu.vercel.app`

Redeploy tetikler → bitince her şey hazır!

---

## Test (Canlı)

```bash
# Backend health
curl https://campus-safety-xxx.railway.app/api/health

# Seed (ilk kurulumda bir kez)
# Railway dashboard → "Run Command" → node src/scripts/seed.js
```

Veya frontend aç → `https://campus-safety-btu.vercel.app` → Login: `admin@btu.edu.tr / admin123`

---

## Özet

```
MongoDB Atlas  ←──→  Railway Backend  ←──→  Vercel Frontend
(ücretsiz DB)         (Node.js API)          (React SPA)
                      Socket.io               Tailwind + Leaflet
```

Hepsi **ücretsiz** — hiçbir kredi kartı gerekmez.
