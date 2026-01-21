# Backend News Express - WordPress Migration

Backend REST API untuk aplikasi news/berita yang dimigrasikan dari WordPress.

## Fitur

- ✅ Migrasi data dari WordPress (posts, categories, tags, users)
- ✅ REST API untuk Posts, Categories, Tags
- ✅ Upload gambar dengan Multer
- ✅ Sequelize ORM dengan MySQL
- ✅ JWT Authentication
- ✅ Pagination dan filtering

## Struktur Database

### Models
- **User** - User/penulis artikel
- **Post** - Artikel/berita
- **Category** - Kategori artikel (dengan parent-child support)
- **Tag** - Tag artikel
- **PostCategory** - Relasi many-to-many Post-Category
- **PostTag** - Relasi many-to-many Post-Tag

## Konfigurasi

### 1. Setup Database

Database sudah dikonfigurasi di `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=wp397
DB_PORT=8889
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Migrasi Data dari WordPress

Jalankan script migrasi untuk copy data dari WordPress:

```bash
npm run migrate
```

Script ini akan:
- Membaca data dari tabel WordPress (`wp_posts`, `wp_terms`, dll)
- Membuat tabel baru untuk sistem custom
- Copy semua categories, tags, users, dan posts
- Maintain relationships (post-category, post-tag)
- Preserve WordPress URLs untuk gambar

## API Endpoints

### Posts

```
GET    /api/posts              - Get all posts (dengan pagination)
GET    /api/posts/popular      - Get popular posts (berdasarkan views)
GET    /api/posts/recent       - Get recent posts
GET    /api/posts/:slug        - Get single post by slug
POST   /api/posts              - Create new post
PUT    /api/posts/:id          - Update post
DELETE /api/posts/:id          - Delete post
```

**Query Parameters untuk GET /api/posts:**
- `page` - Halaman (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status (publish, draft, pending)
- `category` - Filter by category slug
- `tag` - Filter by tag slug
- `search` - Search in title and content
- `sort` - Sort by field (default: published_at)
- `order` - Sort order (ASC/DESC, default: DESC)

**Contoh:**
```bash
# Get all published posts
GET /api/posts?status=publish&page=1&limit=10

# Get posts by category
GET /api/posts?category=teknologi

# Search posts
GET /api/posts?search=javascript&status=publish
```

### Categories

```
GET    /api/categories              - Get all categories
GET    /api/categories/:slug        - Get single category
GET    /api/categories/:slug/posts  - Get posts by category
POST   /api/categories              - Create new category
PUT    /api/categories/:id          - Update category
DELETE /api/categories/:id          - Delete category
```

### Upload

```
POST   /api/upload/image     - Upload single image
POST   /api/upload/images    - Upload multiple images (max 10)
```

**Contoh Upload:**
```bash
curl -X POST http://localhost:5000/api/upload/image \
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
    "fullUrl": "http://localhost:5000/uploads/images/1234567890-123456789.jpg",
    "size": 123456
  }
}
```

### Authentication

```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login user
```

## Menjalankan Server

### Development mode (dengan auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Server akan berjalan di `http://localhost:5000`

## Struktur Folder

```
backend-news-express/
├── config/
│   └── database.js          # Konfigurasi Sequelize
├── controller/
│   ├── auth.js              # Auth controller
│   ├── postController.js    # Post CRUD operations
│   └── categoryController.js # Category CRUD operations
├── middleware/
│   └── upload.js            # Multer configuration
├── routes/
│   ├── auth.js              # Auth routes
│   ├── posts.js             # Post routes
│   ├── categories.js        # Category routes
│   └── upload.js            # Upload routes
├── schema/
│   ├── index.js             # Model relationships
│   ├── user.js              # User model
│   ├── post.js              # Post model
│   ├── category.js          # Category model
│   ├── tag.js               # Tag model
│   ├── postCategory.js      # Post-Category junction
│   └── postTag.js           # Post-Tag junction
├── scripts/
│   └── migrate-from-wordpress.js  # Migration script
├── uploads/
│   └── images/              # Uploaded images
├── .env                     # Environment variables
├── app.js                   # Main application
└── package.json
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
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
  "error": "Detailed error (development only)"
}
```

## Frontend Integration

Untuk mengintegrasikan dengan frontend:

1. Set base URL di frontend: `http://localhost:5000/api`
2. Untuk gambar WordPress yang sudah ada, URL tetap menggunakan path original dari WordPress
3. Untuk gambar baru yang diupload, gunakan endpoint `/api/upload/image`
4. Pastikan CORS sudah enabled (sudah disetup di app.js)

## Catatan Penting

### Prefix WordPress
Script migrasi menggunakan prefix `wp_` untuk tabel WordPress. Jika prefix berbeda, edit di `scripts/migrate-from-wordpress.js`:

```javascript
const WP_PREFIX = "wp_"; // Ganti sesuai prefix Anda
```

### WordPress Password
Password dari WordPress akan tetap disimpan dengan hash WordPress. Untuk login di sistem baru, users perlu reset password atau Anda bisa implement WordPress password verification.

### Gambar/Media
- Gambar dari WordPress akan tetap menggunakan URL original (field `featured_image` di Post)
- Untuk upload gambar baru, gunakan endpoint `/api/upload/image`
- Gambar disimpan di folder `uploads/images/`

## Next Steps

1. ✅ Migrasi data dari WordPress
2. ⏳ Setup authentication middleware
3. ⏳ Implement authorization (role-based access)
4. ⏳ Setup frontend (React/Vue/Next.js)
5. ⏳ Deploy ke production

## Troubleshooting

### Database connection error
- Pastikan MAMP sudah running
- Check port MySQL (default MAMP: 8889)
- Verify credentials di .env

### Migration error
- Pastikan tabel WordPress masih ada
- Check prefix tabel WordPress
- Verify database connection

### Upload error
- Check folder permissions untuk `uploads/`
- Verify file size (max 5MB)
- Check file type (hanya images)
