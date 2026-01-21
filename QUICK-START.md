# Quick Start Guide - Backend News Express (Local Development)

## Setup Selesai! ✅

Backend sudah dikonfigurasi dengan lengkap untuk development lokal.

## Apa yang Sudah Dibuat

### 1. Models & Database Schema
- ✅ User model (users)
- ✅ Post model (posts)
- ✅ Category model (categories)
- ✅ Tag model (tags)
- ✅ Post-Category relationship (many-to-many)
- ✅ Post-Tag relationship (many-to-many)

### 2. REST API Endpoints

#### Posts
```
GET    /api/posts                    - List posts (dengan pagination & filter)
GET    /api/posts/popular            - Popular posts (by views)
GET    /api/posts/recent             - Recent posts
GET    /api/posts/:slug              - Single post detail
POST   /api/posts                    - Create post
PUT    /api/posts/:id                - Update post
DELETE /api/posts/:id                - Delete post
```

#### Categories
```
GET    /api/categories               - List all categories
GET    /api/categories/:slug         - Single category
GET    /api/categories/:slug/posts   - Posts by category
POST   /api/categories               - Create category
PUT    /api/categories/:id           - Update category
DELETE /api/categories/:id           - Delete category
```

#### Upload
```
POST   /api/upload/image             - Upload single image
POST   /api/upload/images            - Upload multiple images (max 10)
```

#### Auth
```
POST   /api/auth/register            - Register user
POST   /api/auth/login               - Login user
```

### 3. Scripts

```bash
npm start       # Start server (production mode)
npm run dev     # Start server (development mode dengan auto-reload)
npm run seed    # Populate sample data untuk testing
npm run migrate # Migrate data dari WordPress (jika ada tabel WP)
```

## Konfigurasi Saat Ini

**Database:** MySQL via MAMP
- Host: localhost
- Port: 8889
- User: root
- Password: root
- Database: wp397

**Server:** Express.js
- Port: 3001
- Base URL: http://localhost:3001

## Cara Menggunakan

### 1. Start Server

```bash
cd /Users/mm/Desktop/news/backend-news-express
npm run dev
```

Server akan jalan di: **http://localhost:3001**

### 2. Test API

#### Menggunakan curl:

```bash
# Get all posts
curl "http://localhost:3001/api/posts"

# Get posts dengan filter
curl "http://localhost:3001/api/posts?category=teknologi&limit=5"

# Search posts
curl "http://localhost:3001/api/posts?search=indonesia"

# Get categories
curl "http://localhost:3001/api/categories"

# Get single post
curl "http://localhost:3001/api/posts/perkembangan-teknologi-ai-indonesia-2026"
```

#### Menggunakan Browser:
Buka di browser:
- http://localhost:3001/api/posts
- http://localhost:3001/api/categories
- http://localhost:3001/api/posts/popular

#### Menggunakan Postman/Thunder Client:
Import file `test-api.http` untuk testing di VSCode REST Client extension.

### 3. Sample Data

Untuk testing, sudah ada sample data:

**Users:**
- Admin: admin@example.com / password123
- Writer: writer@example.com / password123

**Posts:** 4 published posts + 1 draft
**Categories:** Berita, Teknologi, Olahraga, Politik, Ekonomi
**Tags:** Breaking News, Trending, Viral, Investigasi, Opini

Untuk reset dan populate ulang:
```bash
npm run seed
```

## Migrasi Data dari WordPress

Jika Anda sudah punya data WordPress di database `wp397`:

### Cek apakah tabel WordPress ada:
Buka phpMyAdmin (MAMP) dan cek tabel:
- wp_posts
- wp_terms
- wp_term_taxonomy
- wp_users
- dll

### Jalankan migration:
```bash
npm run migrate
```

**Note:** Migration script akan:
1. Baca data dari tabel WordPress (prefix: `wp_`)
2. Copy ke tabel baru (posts, categories, tags, users)
3. Preserve semua relationships
4. Keep WordPress IDs untuk reference

Lihat file `MIGRATION-GUIDE.md` untuk detail lengkap.

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error info"
}
```

## Query Parameters

### GET /api/posts

```
?page=1              - Page number (default: 1)
?limit=10            - Items per page (default: 10)
?status=publish      - Filter by status (publish|draft|pending)
?category=slug       - Filter by category slug
?tag=slug            - Filter by tag slug
?search=keyword      - Search in title & content
?sort=published_at   - Sort field (default: published_at)
?order=DESC          - Sort order (ASC|DESC, default: DESC)
```

**Contoh:**
```bash
# Posts terbaru
curl "http://localhost:3001/api/posts?limit=5&sort=published_at&order=DESC"

# Posts by category
curl "http://localhost:3001/api/posts?category=teknologi"

# Search posts
curl "http://localhost:3001/api/posts?search=indonesia&status=publish"

# Pagination
curl "http://localhost:3001/api/posts?page=2&limit=10"
```

## Upload Gambar

### Single Image
```bash
curl -X POST http://localhost:3001/api/upload/image \
  -F "image=@/path/to/image.jpg"
```

Response:
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "filename": "1234567890-123456789.jpg",
    "url": "/uploads/images/1234567890-123456789.jpg",
    "fullUrl": "http://localhost:3001/uploads/images/1234567890-123456789.jpg",
    "size": 123456
  }
}
```

### Multiple Images
```bash
curl -X POST http://localhost:3001/api/upload/images \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

**Limits:**
- Max file size: 5MB per image
- Allowed formats: jpg, jpeg, png, gif, webp
- Max 10 images per request (untuk multiple upload)

## Create Post via API

```bash
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Judul Artikel Baru",
    "slug": "judul-artikel-baru",
    "content": "<p>Konten artikel dalam HTML</p>",
    "excerpt": "Ringkasan artikel",
    "status": "publish",
    "featured_image": "/uploads/images/image.jpg",
    "category_ids": [1, 2],
    "tag_ids": [1]
  }'
```

## Struktur Folder

```
backend-news-express/
├── config/
│   └── database.js              # Sequelize config
├── controller/
│   ├── auth.js                  # Auth controller
│   ├── postController.js        # Posts CRUD
│   └── categoryController.js    # Categories CRUD
├── middleware/
│   └── upload.js                # Multer config
├── routes/
│   ├── auth.js
│   ├── posts.js
│   ├── categories.js
│   └── upload.js
├── schema/
│   ├── index.js                 # Models & relationships
│   ├── user.js
│   ├── post.js
│   ├── category.js
│   ├── tag.js
│   ├── postCategory.js
│   └── postTag.js
├── scripts/
│   ├── migrate-from-wordpress.js  # WP migration
│   └── seed-sample-data.js        # Sample data seeder
├── uploads/
│   └── images/                    # Uploaded images
├── .env                           # Environment config
├── app.js                         # Main app
├── package.json
├── README.md                      # Full documentation
├── DEPLOYMENT.md                  # Deployment guide
├── MIGRATION-GUIDE.md             # WP migration guide
└── QUICK-START.md                 # This file
```

## Next Steps - Frontend Development

Untuk membuat frontend yang consume API ini, Anda bisa gunakan:

### React + Vite
```bash
npm create vite@latest frontend-news -- --template react
cd frontend-news
npm install axios react-router-dom
```

### Next.js
```bash
npx create-next-app@latest frontend-news
cd frontend-news
npm install axios
```

### Vue.js
```bash
npm create vue@latest frontend-news
cd frontend-news
npm install axios vue-router
```

### Example: Fetch Posts di Frontend (React)

```javascript
import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/posts?limit=10`)
      .then(res => {
        setPosts(res.data.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>News Articles</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          <span>Views: {post.views}</span>
        </article>
      ))}
    </div>
  );
}

export default App;
```

## Troubleshooting

### Server tidak start
```bash
# Kill process yang menggunakan port 3001
lsof -i :3001
kill -9 <PID>

# Atau ganti port di .env
PORT=3002
```

### Database connection error
- Pastikan MAMP sudah running
- Check port MySQL (default MAMP: 8889)
- Verify credentials di `.env`

### CORS error di frontend
Sudah di-handle, CORS enabled untuk semua origin di development.

Untuk production, edit `app.js`:
```javascript
app.use(cors({
  origin: ['https://yourdomain.com']
}));
```

## Development Tips

1. **Auto-reload:** Gunakan `npm run dev` agar server auto-restart saat edit code
2. **API Testing:** Gunakan Postman, Thunder Client, atau REST Client extension
3. **Database GUI:** Gunakan phpMyAdmin (MAMP) atau TablePlus untuk manage database
4. **Logging:** Check console untuk error messages dan query logs

## Support & Documentation

- `README.md` - Full documentation
- `DEPLOYMENT.md` - Production deployment guide
- `MIGRATION-GUIDE.md` - WordPress migration details
- `test-api.http` - API endpoint examples

---

**Server Status:** ✅ Running on http://localhost:3001

Happy coding! 🚀
