# Debug Endpoints - Telegram Issue Diagnostics

Endpoints ini untuk diagnose kenapa notifikasi Telegram approve/reject tidak terkirim.

## 1. Test Telegram Connection

**Endpoint:** `POST /api/debug/telegram/test`

**Require:** Admin login

**Request Body:**

```json
{
  "topic": "APPROVAL",
  "message": "Test message untuk verifikasi connection"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3001/api/debug/telegram/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topic": "APPROVAL",
    "message": "Test message"
  }'
```

**Response Sukses:**

```json
{
  "success": true,
  "message": "Telegram test message sent successfully",
  "result": {
    "messageId": 123456,
    "topic": "APPROVAL",
    "timestamp": "2026-09-01T20:33:00.000Z"
  }
}
```

**Response Error:**

```json
{
  "success": false,
  "message": "Failed to send test message",
  "error": "Error message details",
  "details": {
    "tokenSet": true,
    "chatIdSet": true,
    "chatId": "-1003881909105",
    "botToken": "8310564211..."
  }
}
```

**Topics yang bisa di-test:**

- `APPROVAL` - Notifikasi approval artikel
- `REVISI_ARTIKEL` - Notifikasi revisi request
- `ARTIKEL_MASUK` - Notifikasi artikel baru
- `SYSTEM_ERROR` - Notifikasi error sistem

---

## 2. Check Pending Notifications

**Endpoint:** `GET /api/debug/notifications/pending`

**Require:** Admin login

**cURL Example:**

```bash
curl -X GET http://localhost:3001/api/debug/notifications/pending \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "pending": {
      "count": 5,
      "items": [
        {
          "id": 1,
          "article_uuid": "abc-123",
          "target": "Judul Artikel",
          "status": "pending",
          "created_at": "2026-09-01T20:00:00Z"
        }
      ]
    },
    "approved": {
      "count": 10,
      "items": [...]
    },
    "rejected": {
      "count": 3,
      "items": [...]
    }
  }
}
```

---

## 3. Test Approval Action

**Endpoint:** `POST /api/debug/test-approval/:articleUuid`

**Require:** Admin login

**Parameters:**

- `articleUuid` - UUID artikel yang akan di-test approve

**cURL Example:**

```bash
curl -X POST "http://localhost:3001/api/debug/test-approval/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**What it does:**

- Mencoba approve artikel seperti editor click approve di dashboard
- Mengirim Telegram notification ke topic APPROVAL
- Logging semua step di console server

**Check console untuk:**

```
[DEBUG] Simulating approval for post: 550e8400-e29b-41d4-a716-446655440000
[Telegram] Message sent to topic 1569: { messageId: 12345, topic: 'APPROVAL' }
```

---

## 4. Check Recent Activity Logs

**Endpoint:** `GET /api/debug/activity-logs?limit=50`

**Require:** Admin login

**cURL Example:**

```bash
curl -X GET "http://localhost:3001/api/debug/activity-logs?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "count": 50,
    "items": [
      {
        "id": 1,
        "article_uuid": "abc-123",
        "action": "APPROVED",
        "status_before": "IN_REVIEW",
        "status_after": "APPROVED",
        "post_title": "Judul Artikel",
        "created_at": "2026-09-01T20:30:00Z"
      }
    ]
  }
}
```

---

## Troubleshooting Steps

### 1. **Telegram bot token salah/tidak set**

```bash
# Check di .env file
TELEGRAM_BOT_TOKEN=8310564211:AAHq8x9kkZ_A907UrgMggJ8GY_liPyH3yUk
```

Jika undefined, tambahkan token yang benar dari @BotFather

### 2. **Chat ID salah format**

```bash
# Chat ID harus dimulai dengan -100 untuk supergroup dengan topic
TELEGRAM_CHAT_ID=-1003881909105
```

Format salah akan warning di console tapi tetap kirim ke grup utama

### 3. **Topic ID tidak ada**

```bash
# Pastikan topic ID sesuai:
TELEGRAM_TOPIC_APPROVAL=1569
TELEGRAM_TOPIC_REVISI_ARTIKEL=1572
```

### 4. **Network/Timeout Issue**

- Telegram API timeout: 5 detik
- Jika timeout, akan error di console: `[Telegram] Request timeout after 5 seconds`
- Check internet connection di server

### 5. **Permission Issue**

- Bot harus admin di supergroup
- Bot harus bisa post ke topic yang dituju
- Run test endpoint untuk verify

---

## Logs Location

Saat approval/reject di dashboard, check console server untuk:

```
[DEBUG] Simulating approval for post: xxx
[Telegram] Approval notification failed: ERR_MESSAGE
[SystemError] Telegram approval notification failed - ...
```

Atau di database, check:

- Table `Notifications` - status berubah jadi "approved"?
- Table `ArticleActivities` - ada log APPROVED?
- Table `Posts` - workflow_status berubah jadi APPROVED?

---

## Quick Test Sequence

1. **Verify Telegram Connection:**

   ```bash
   POST /api/debug/telegram/test
   ```

   - Harus success dan pesan muncul di Telegram

2. **Check Notifications Status:**

   ```bash
   GET /api/debug/notifications/pending
   ```

   - Lihat ada berapa pending notifications

3. **Simulate Approval:**
   - Ambil satu article UUID dari pending

   ```bash
   POST /api/debug/test-approval/{articleUuid}
   ```

   - Check console untuk Telegram message log
   - Check Telegram group untuk message

4. **Verify Database:**
   ```bash
   GET /api/debug/activity-logs
   ```

   - Pastikan ada log APPROVED terbaru

---

## Common Issues & Solutions

| Issue                                                             | Cause                                | Solution                                      |
| ----------------------------------------------------------------- | ------------------------------------ | --------------------------------------------- |
| "Telegram test message sent successfully" tapi pesan tidak muncul | Bot tidak admin/tidak bisa post      | Tambah bot sebagai admin di group             |
| Topic ID salah                                                    | Mixing up topic IDs                  | Verify di @BotFather atau settings supergroup |
| Timeout error                                                     | Network issue atau Telegram API down | Retry atau check Telegram API status          |
| "article_uuid not found"                                          | UUID salah                           | Copy UUID dari dashboard atau DB              |
| Message sent tapi status tidak update                             | Flow issue di controller             | Check notificationController.js               |

---

## Getting Admin Token for Testing

Jika sudah login di dashboard:

1. Buka DevTools (F12)
2. Go to Application/Storage → Cookies
3. Cari token atau localStorage → `auth_token`
4. Copy tokennya untuk Authorization header

---

## Next Steps

1. Jika test endpoint berhasil → masalah di approval flow logic
2. Jika test endpoint gagal → masalah di Telegram config
3. Jika timeout → check network/firewall
4. Jika message kirim tapi status tidak update → check database transaction

Good luck! 🚀
