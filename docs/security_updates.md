# Dokumentasi Pembaruan Keamanan Backend Al-Muhtada

Dokumen ini menjelaskan implementasi perbaikan keamanan backend Express.js untuk sistem berita Al-Muhtada guna mengatasi tiga kerentanan utama:
1. **Celah Otorisasi Rute Admin (Broken Access Control)**
2. **Ketiadaan Rate Limiting (Proteksi Spam/Brute Force)**
3. **Ketiadaan Header Keamanan (Helmet)**

---

## 1. Celah Otorisasi Rute Admin (Broken Access Control) 🔴

### Masalah
Rute manajemen pengguna (`/api/users/*`) dan pengaturan website (`/api/settings/*`) sebelumnya hanya terlindung oleh middleware `authenticate` (JWT validasi), namun tidak memverifikasi apakah peran (role) pengguna adalah administrator. Akibatnya:
- Pengguna biasa dapat memodifikasi rolenya sendiri menjadi `administrator` melalui `PUT /api/users/:id`.
- Pengguna biasa dapat melihat daftar email pengguna lain melalui `GET /api/users`.
- Pengguna biasa dapat memodifikasi konfigurasi sensitif website melalui `PUT /api/settings/*`.
- Endpoint `POST /api/settings/initialize` terekspos tanpa otentikasi, memungkinkan inisialisasi ulang database tanpa login.

### Solusi
Mengimpor middleware `authorize` dari `src/middleware/auth.js` dan menerapkannya pada rute-rute admin berikut:

* **Rute Manajemen Pengguna ([src/routes/users.js](file:///C:/Users/muham/Desktop/almuhtada/backend-news-js/src/routes/users.js))**:
  - `GET /` -> `authenticate`, `authorize("administrator")`, `getUsers`
  - `GET /:id` -> `authenticate`, `authorize("administrator")`, `getUser`
  - `POST /` -> `authenticate`, `authorize("administrator")`, `createUser`
  - `PUT /:id` -> `authenticate`, `authorize("administrator")`, `updateUser`
  - `DELETE /:id` -> `authenticate`, `authorize("administrator")`, `deleteUser`

* **Rute Pengaturan Website ([src/routes/settings.js](file:///C:/Users/muham/Desktop/almuhtada/backend-news-js/src/routes/settings.js))**:
  - `POST /initialize` -> `authenticate`, `authorize("administrator")`, `initializeSettings`
  - `POST /save` -> `authenticate`, `authorize("administrator")`, `saveAllSettings`
  - `PUT /bulk` -> `authenticate`, `authorize("administrator")`, `bulkUpdateSettings`
  - `PUT /:key` -> `authenticate`, `authorize("administrator")`, `updateSetting`

---

## 2. Ketiadaan Rate Limiting (Proteksi Spam/Brute Force) 🟡

### Masalah
Rute masuk (login) dan registrasi tidak memiliki pembatasan frekuensi akses. Hal ini rentan terhadap serangan brute force untuk menebak kata sandi admin atau membanjiri server dengan registrasi akun bot secara otomatis.

### Solusi
1. Menginstal paket `express-rate-limit`.
2. Membuat middleware limiter khusus di [src/middleware/rateLimiter.js](file:///C:/Users/muham/Desktop/almuhtada/backend-news-js/src/middleware/rateLimiter.js) dengan aturan:
   - Pembatasan maksimal **20 permintaan per 15 menit** untuk setiap alamat IP.
   - Mengembalikan respon terstandarisasi saat terkena limit:
     ```json
     {
       "success": false,
       "message": "Terlalu banyak permintaan login atau registrasi dari IP ini. Silakan coba lagi setelah 15 menit."
     }
     ```
3. Menerapkan middleware `authRateLimiter` pada rute registrasi dan masuk di [src/routes/auth.js](file:///C:/Users/muham/Desktop/almuhtada/backend-news-js/src/routes/auth.js):
   - `router.post("/register", authRateLimiter, register)`
   - `router.post("/login", authRateLimiter, login)`

---

## 3. Ketiadaan Header Keamanan (Helmet) 🟡

### Masalah
Aplikasi Express tidak mengirimkan HTTP header keamanan dasar (seperti perlindungan XSS, klik-bajak, pengendus tipe MIME, dll.), yang merupakan best practice untuk menghalangi eksploitasi browser klien.

### Solusi
1. Menginstal paket `helmet`.
2. Memasang middleware `helmet` di posisi awal berkas utama [src/server.js](file:///C:/Users/muham/Desktop/almuhtada/backend-news-js/src/server.js):
   ```javascript
   const helmet = require("helmet");

   // Security Headers
   app.use(
     helmet({
       contentSecurityPolicy: false, // Dinonaktifkan khusus agar kompatibel dengan Swagger UI
     })
   );
   ```
   *Catatan: Parameter `contentSecurityPolicy: false` diatur agar aset inline CSS/JS dari Swagger UI tetap dapat dimuat dengan baik untuk dokumentasi API.*

---

## 4. Pengujian Keamanan (Testing) 🧪

Telah dibuat berkas uji otomatis di [test/security.test.js](file:///C:/Users/muham/Desktop/almuhtada/backend-news-js/test/security.test.js) menggunakan **Supertest** dan **Jest** untuk memvalidasi:
- Keberadaan header keamanan Helmet (`x-frame-options`, `x-content-type-options`, dan `x-dns-prefetch-control`).
- Kinerja pembatasan rate limit (memastikan permintaan ke-21 diblokir dengan status HTTP 429).

Seluruh pengujian sukses dijalankan dengan perintah `npm test`.
