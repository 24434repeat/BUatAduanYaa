# Panduan Deploy ke Vercel

## Prerequisites
1. Akun Vercel (gratis di https://vercel.com)
2. Kode sudah di-push ke GitHub/GitLab/Bitbucket
3. Google Apps Script sudah di-deploy dan mendapatkan URL

## Langkah-langkah Deploy

### 1. Push Kode ke Repository Git
```bash
# Pastikan semua perubahan sudah di-commit
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Deploy ke Vercel

#### Opsi A: Via Vercel Dashboard (Recommended)
1. Buka https://vercel.com dan login
2. Klik **"Add New..."** → **"Project"**
3. Import repository Anda (GitHub/GitLab/Bitbucket)
4. Vercel akan otomatis mendeteksi Next.js project
5. **Jangan klik Deploy dulu!** Lanjut ke langkah 3

#### Opsi B: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login ke Vercel
vercel login

# Deploy (akan ada prompt untuk konfigurasi)
vercel

# Untuk production
vercel --prod
```

### 3. Konfigurasi Environment Variables

**PENTING:** Set environment variables sebelum deploy!

1. Di halaman project setup Vercel, scroll ke **"Environment Variables"**
2. Tambahkan environment variables berikut:

   | Name | Value | Description |
   |------|-------|-------------|
   | `NEXT_PUBLIC_GAS_URL` | `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec` | URL Google Apps Script Web App |
   | `NEXT_PUBLIC_ADMIN_PASSWORD` | `password_anda` | Password untuk halaman admin |

3. Pastikan semua environment variables sudah ditambahkan
4. Klik **"Deploy"**

### 4. Verifikasi Deploy

Setelah deploy selesai:
1. Vercel akan memberikan URL production (contoh: `https://your-app.vercel.app`)
2. Buka URL tersebut di browser
3. Test halaman utama (form laporan)
4. Test halaman admin di `/admin`

### 5. Update Google Apps Script (Jika Perlu)

Jika Google Apps Script URL berubah atau perlu update:
1. Buka Google Apps Script Editor
2. Deploy ulang sebagai Web App
3. Copy URL baru
4. Update `NEXT_PUBLIC_GAS_URL` di Vercel:
   - Buka project di Vercel Dashboard
   - Settings → Environment Variables
   - Edit `NEXT_PUBLIC_GAS_URL`
   - Redeploy

## Troubleshooting

### Error: "Backend URL is not configured"
- Pastikan `NEXT_PUBLIC_GAS_URL` sudah di-set di Environment Variables
- Pastikan URL Google Apps Script sudah benar
- Redeploy setelah menambahkan environment variables

### Error: "ADMIN password belum dikonfigurasi"
- Pastikan `NEXT_PUBLIC_ADMIN_PASSWORD` sudah di-set di Environment Variables
- Redeploy setelah menambahkan environment variables

### Build Error
- Pastikan semua dependencies terinstall: `npm install`
- Test build lokal: `npm run build`
- Periksa error di Vercel build logs

### Google Apps Script tidak terhubung
- Pastikan Google Apps Script sudah di-deploy sebagai Web App
- Pastikan "Execute as" di-set ke "Me"
- Pastikan "Who has access" di-set ke "Anyone"
- Test URL Google Apps Script langsung di browser

## Tips

1. **Environment Variables untuk Environment Berbeda:**
   - Production: Set di Production environment
   - Preview: Set di Preview environment (optional)
   - Development: Gunakan `.env.local` di local

2. **Custom Domain:**
   - Settings → Domains → Add domain
   - Ikuti instruksi untuk setup DNS

3. **Monitoring:**
   - Gunakan Vercel Analytics untuk monitoring
   - Check logs di Vercel Dashboard → Deployments → View Function Logs

## Support

Jika ada masalah, cek:
- Vercel Documentation: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment

