# 🧹 Database Cleanup - Quick Guide

Drop semua tabel WordPress (wp8o_*) dengan 1 command!

---

## 🚀 Cara Pakai (Super Mudah!)

### Opsi 1: Pakai Script Otomatis (Recommended)

Script ini akan:
- ✅ Auto backup database dulu
- ✅ Drop semua wp8o_* tables
- ✅ Verifikasi cleanup
- ✅ Show summary

```bash
# Upload files ke server
scp cleanup-database.sh drop-wp8o-tables.sql root@api.almuhtada.org:/var/www/backend-news-js/

# SSH ke server
ssh root@api.almuhtada.org
cd /var/www/backend-news-js

# Jalankan cleanup script
chmod +x cleanup-database.sh
./cleanup-database.sh
```

Script akan tanya konfirmasi sebelum drop:
```
⚠️  WARNING: This will permanently delete all WordPress tables!
Backup saved at: ./backups/backup_before_cleanup_20260130_135500.sql

Are you sure you want to continue? (yes/no):
```

Ketik `yes` untuk lanjut, atau `no` untuk cancel.

---

### Opsi 2: Manual via MySQL

Kalau mau manual, pakai SQL file:

```bash
# 1. Backup dulu
mysqldump -u news -p news_db > backup_$(date +%Y%m%d).sql

# 2. Drop tables
mysql -u news -p news_db < drop-wp8o-tables.sql

# 3. Verifikasi
mysql -u news -p news_db -e "SHOW TABLES;"
```

---

## 📊 Yang Akan Di-Drop

Total: **53 tabel WordPress**

Tabel terbesar:
- `wp8o_posts` - 40.20 MB (13,631 rows)
- `wp8o_popularpostssummary` - 40.13 MB (309,600 rows)
- `wp8o_postmeta` - 38.50 MB (165,334 rows)
- `wp8o_options` - 9.28 MB (524 rows)
- Dan 49 tabel lainnya...

**Total space yang akan di-free up: ~150 MB**

---

## ✅ Yang TIDAK Di-Drop (Tetap Aman)

Tabel custom backend (16 tabel):
- ✓ users
- ✓ posts
- ✓ categories
- ✓ tags
- ✓ comments
- ✓ media
- ✓ pages
- ✓ page_contents
- ✓ post_categories
- ✓ post_tags
- ✓ post_likes
- ✓ about_sections
- ✓ achievements
- ✓ publications
- ✓ notifications
- ✓ settings

---

## 🔄 Restore Jika Salah

Kalau ada masalah, restore dari backup:

```bash
# List backups
ls -lh backups/

# Restore
mysql -u news -p news_db < backups/backup_before_cleanup_20260130_135500.sql
```

---

## 🧪 Test Setelah Cleanup

```bash
# 1. Check backend masih jalan
pm2 status
pm2 logs

# 2. Test API endpoints
curl http://localhost:3001/api/posts
curl http://localhost:3001/api/categories
curl http://localhost:3001/api/users

# 3. Cek database size
mysql -u news -p -e "
SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'news_db'
GROUP BY table_schema;
"
```

---

## 📋 Output Script

Contoh output kalau berhasil:

```
==========================================
🧹 Database Cleanup - Drop WordPress Tables
==========================================

✅ Loaded .env file

📋 Database Info:
   Host: localhost
   Database: news_db
   User: news

✅ Backup directory ready: ./backups

💾 Step 1/4: Creating database backup...
   Backup file: ./backups/backup_before_cleanup_20260130_135500.sql

✅ Backup created successfully! Size: 122M

🗑️  Step 2/4: Tables yang akan di-drop:
   ✗ wp8o_posts
   ✗ wp8o_postmeta
   ✗ wp8o_users
   ... (50 more tables)

⚠️  WARNING: This will permanently delete all WordPress tables!
Backup saved at: ./backups/backup_before_cleanup_20260130_135500.sql

Are you sure you want to continue? (yes/no): yes

🔥 Step 3/4: Dropping WordPress tables...
✅ WordPress tables dropped successfully!

🔍 Step 4/4: Verifying cleanup...

==========================================
✅ Cleanup completed!
==========================================

📊 Summary:
   WordPress tables remaining: 0
   Total tables in database: 16
   Backup file: ./backups/backup_before_cleanup_20260130_135500.sql
   Backup size: 122M

✅ All WordPress tables successfully removed!

📋 Remaining tables in database:
   ✓ users
   ✓ posts
   ✓ categories
   ✓ tags
   ... (12 more)

💾 Database size after cleanup:
+----------+-----------+
| Database | Size (MB) |
+----------+-----------+
| news_db  |     45.32 |
+----------+-----------+

==========================================
🎉 Database cleanup successful!
==========================================
```

---

## ❓ FAQ

**Q: Apakah aman?**
A: Ya! Script auto backup dulu sebelum drop.

**Q: Bisa di-undo?**
A: Ya! Restore dari backup file.

**Q: Berapa lama prosesnya?**
A: Backup: ~30 detik, Drop: ~5 detik, Total: <1 menit.

**Q: Data posts/users akan hilang?**
A: TIDAK! Data sudah di-migrate ke custom tables.

**Q: Kapan sebaiknya cleanup?**
A: Setelah yakin sistem backend berjalan normal dengan custom tables.

---

## 🆘 Troubleshooting

### Error: mysqldump: command not found

```bash
# Install MySQL client
dnf install mysql -y  # AlmaLinux
apt install mysql-client -y  # Ubuntu
```

### Error: Access denied

```bash
# Check DB credentials di .env
cat .env | grep DB_

# Test connection
mysql -h localhost -u news -p news_db -e "SHOW TABLES;"
```

### Error: Cannot drop table (foreign key)

Script sudah handle dengan `SET FOREIGN_KEY_CHECKS = 0`

---

**Siap cleanup? Jalankan: `./cleanup-database.sh`** 🚀
