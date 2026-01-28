# Backend News Express - Documentation

## 📖 Daftar Isi

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Database](#database)
5. [API Documentation](#api-documentation)
6. [Project Structure](#project-structure)
7. [Controllers & Routes](#controllers--routes)
8. [Configuration](#configuration)
9. [Development](#development)
10. [Deployment](#deployment)

---

## Overview

**Backend News Express** adalah REST API untuk aplikasi News Al-Muhtada, dibangun dengan:

- **Express.js** - Web framework
- **MySQL** - Database
- **Sequelize** - ORM
- **JWT** - Authentication
- **Swagger** - API documentation
- **Multer** - File upload

### Features

✅ Post management (CRUD)  
✅ User authentication & authorization  
✅ Category & tag management  
✅ Author & publication management  
✅ File upload & handling  
✅ Comments & interactions  
✅ Notifications system  
✅ Telegram integration  
✅ Statistics & analytics  
✅ Admin dashboard API

---

## Quick Start

### Prerequisites

- Node.js v18+
- MySQL v8+
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd backend-news-express

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan database credentials

# Database setup
npm run migrate
npm run seed

# Start development
npm run dev

# Start production
npm start
```

### Environment Variables

```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_USER=news_user
DB_PASSWORD=password
DB_NAME=news_db
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
UPLOAD_PATH=./uploads
CORS_ORIGIN=http://localhost:3000
```

---

## Architecture

### Folder Structure

```
backend-news-express/
├── controller/          # Business logic
├── routes/              # API endpoints
├── schema/              # Database models (Sequelize)
├── middleware/          # Custom middleware
├── services/            # Business services
├── config/              # Configuration
├── migrations/          # Database migrations
├── scripts/             # Utility scripts
├── ai-news/             # AI/ML models
├── uploads/             # Uploaded files
├── app.js               # Express app setup
├── swagger.js           # Swagger config
└── package.json         # Dependencies
```

### Request Flow

```
Request
  ↓
Routes (routes/*.js)
  ↓
Middleware (authentication, validation)
  ↓
Controller (controller/*.js)
  ↓
Service/Model (schema/*.js)
  ↓
Database (MySQL)
  ↓
Response
```

---

## Database

### Schema Overview

#### Core Tables

- **User** - User accounts & profiles
- **Post** - News posts/articles
- **Category** - Post categories
- **Tag** - Post tags
- **Author** - Author information
- **Publication** - Publication details
- **Comment** - Post comments
- **Interaction** - Likes, views, etc.
- **Notification** - System notifications

#### Helper Tables

- **PostCategory** - Many-to-many posts & categories
- **PostTag** - Many-to-many posts & tags
- **PostLike** - Post likes/reactions
- **Media** - File attachments
- **Settings** - Application settings
- **PageContent** - Static page content
- **Achievement** - User achievements

### Database Relationships

```
User
├── Posts (1:N)
├── Comments (1:N)
└── Interactions (1:N)

Post
├── Category (N:M via PostCategory)
├── Tags (N:M via PostTag)
├── Comments (1:N)
├── Likes (1:N)
└── Author (N:1)

Category
└── Posts (N:M)

Tag
└── Posts (N:M)
```

### Migrations

```bash
# Run migrations
npm run migrate

# Run all migrations
npm run migrate:all

# Seed sample data
npm run seed

# Clean sample data
npm run clean:sample
```

---

## API Documentation

### Base URL

```
http://localhost:3001/api
```

### Swagger UI

```
http://localhost:3001/api-docs
```

### Authentication

Most endpoints require JWT token in header:

```
Authorization: Bearer <your_jwt_token>
```

### Core Endpoints

#### Posts (`/posts`)

- `GET /posts` - Get all posts
- `GET /posts/:id` - Get post by ID
- `POST /posts` - Create post (admin)
- `PUT /posts/:id` - Update post (admin)
- `DELETE /posts/:id` - Delete post (admin)
- `GET /posts/:id/comments` - Get post comments

#### Authentication (`/auth`)

- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout user

#### Categories (`/categories`)

- `GET /categories` - Get all categories
- `POST /categories` - Create category (admin)
- `PUT /categories/:id` - Update category (admin)
- `DELETE /categories/:id` - Delete category (admin)

#### Tags (`/tags`)

- `GET /tags` - Get all tags
- `POST /tags` - Create tag (admin)
- `PUT /tags/:id` - Update tag (admin)
- `DELETE /tags/:id` - Delete tag (admin)

#### Users (`/users`)

- `GET /users` - Get all users (admin)
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update profile
- `PUT /users/:id/role` - Update user role (admin)

#### Comments (`/comments`)

- `GET /comments` - Get all comments
- `POST /comments` - Create comment
- `DELETE /comments/:id` - Delete comment

#### Upload (`/upload`)

- `POST /upload` - Upload file
- `DELETE /upload/:filename` - Delete file

#### Notifications (`/notifications`)

- `GET /notifications` - Get notifications
- `POST /notifications` - Send notification (admin)
- `PUT /notifications/:id/read` - Mark as read

#### Interactions (`/interaction`)

- `POST /interaction/like` - Like post
- `POST /interaction/view` - View post
- `GET /interaction/stats/:postId` - Get interaction stats

### Response Format

Success Response (200):

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Error Response (4xx/5xx):

```json
{
  "success": false,
  "message": "Error description",
  "error": { ... }
}
```

---

## Project Structure

### `/controller` - Business Logic

Each controller handles business logic for a resource:

- `postController.js` - Post operations
- `userController.js` - User management
- `categoryController.js` - Category operations
- `tagController.js` - Tag operations
- `authController.js` - Authentication
- `commentController.js` - Comment management
- And more...

Example:

```javascript
// controller/postController.js
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.findAll();
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### `/routes` - API Endpoints

Routes define HTTP endpoints and map to controllers:

- `posts.js` - POST routes
- `auth.js` - Authentication routes
- `users.js` - User routes
- `categories.js` - Category routes
- `tags.js` - Tag routes
- And more...

Example:

```javascript
// routes/posts.js
const express = require("express");
const router = express.Router();
const {
  getPosts,
  getPost,
  createPost,
} = require("../controller/postController");
const { authenticate, authorize } = require("../middleware/auth");

router.get("/", getPosts);
router.get("/:id", getPost);
router.post("/", authenticate, authorize(["admin"]), createPost);

module.exports = router;
```

### `/schema` - Database Models

Sequelize models define database structure:

- `post.js` - Post model
- `user.js` - User model
- `category.js` - Category model
- `tag.js` - Tag model
- `comment.js` - Comment model
- And more...

Example:

```javascript
// schema/post.js
module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define("Post", {
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    status: DataTypes.ENUM("draft", "published"),
  });
  return Post;
};
```

### `/middleware` - Custom Middleware

- `upload.js` - File upload handling with multer

### `/config` - Configuration

- `database.js` - Database connection setup

### `/scripts` - Utility Scripts

- `seed-sample-data.js` - Populate sample data
- `migrate-from-wordpress.js` - Migrate from WordPress
- `clean-content-formatting.js` - Data cleaning
- And more...

---

## Controllers & Routes

### Authentication Controller

```javascript
// POST /auth/register
{
  email: "user@example.com",
  password: "password123",
  name: "John Doe"
}

// POST /auth/login
{
  email: "user@example.com",
  password: "password123"
}
```

### Post Controller

```javascript
// GET /posts
// Query params: page, limit, category, tag, search

// GET /posts/:id
// Returns: Single post with comments

// POST /posts (admin only)
{
  title: "Post Title",
  content: "Post content",
  categoryId: 1,
  tags: [1, 2, 3]
}

// PUT /posts/:id (admin only)
// Same as POST body

// DELETE /posts/:id (admin only)
```

### Category Controller

```javascript
// GET /categories

// POST /categories (admin only)
{
  name: "Category Name",
  slug: "category-name",
  description: "Category description"
}
```

### Tag Controller

```javascript
// GET /tags

// POST /tags (admin only)
{
  name: "Tag Name",
  slug: "tag-name"
}
```

### User Controller

```javascript
// GET /users (admin only)

// GET /users/profile
// Returns: Current user profile

// PUT /users/profile
{
  name: "New Name",
  bio: "User bio",
  avatar: "url"
}

// PUT /users/:id/role (admin only)
{
  role: "admin" // or "user", "editor"
}
```

---

## Configuration

### Database Configuration (`config/database.js`)

```javascript
const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  dialect: "mysql",
});
```

### JWT Configuration

```javascript
// .env
JWT_SECRET=your_random_secret_key
JWT_EXPIRE=7d
```

### CORS Configuration

```javascript
// .env
CORS_ORIGIN=http://localhost:3000,https://example.com
```

### Upload Configuration

```javascript
// middleware/upload.js
const multer = require("multer");
const storage = multer.diskStorage({
  destination: process.env.UPLOAD_PATH || "./uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
```

---

## Development

### Running Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001` with auto-reload via nodemon.

### Database Commands

```bash
# Run migrations
npm run migrate

# Seed data
npm run seed

# Clean sample data
npm run clean:sample

# Sync database
npm run sync:db
```

### API Testing

#### Using REST Client (test-api.http)

```
GET http://localhost:3001/posts

###

POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

#### Using Postman

- Import `postman_collection.json` into Postman
- Set environment variables
- Test endpoints

#### Using cURL

```bash
# Get posts
curl http://localhost:3001/api/posts

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Testing

```bash
npm test
npm run jest
```

---

## Deployment

### Production Deployment

See [VPS-DEPLOYMENT-GUIDE.md](/Users/mm/Desktop/news/VPS-DEPLOYMENT-GUIDE.md) for full deployment instructions.

### Quick Deploy

```bash
# Install dependencies
npm install --production

# Start server
npm start

# Or use PM2
pm2 start app.js --name "news-backend"
```

### Environment Setup

```bash
# Create .env for production
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=news_user
DB_PASSWORD=strong_password
DB_NAME=news_db
JWT_SECRET=random_secret_key
```

---

## Common Tasks

### Add New Endpoint

1. Create controller function in `controller/newFeature.js`
2. Create route file `routes/newFeature.js`
3. Import route in `app.js`
4. Update Swagger documentation in `swagger.js`

### Add New Database Model

1. Create model file in `schema/newModel.js`
2. Import in `schema/index.js`
3. Create migration if needed
4. Define relationships with other models

### Upload Files

```javascript
const upload = require("./middleware/upload");

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ filename: req.file.filename });
});
```

### Authentication

```javascript
const { authenticate, authorize } = require("./middleware/auth");

// Require authentication
router.get("/admin", authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Require specific role
router.delete("/:id", authenticate, authorize(["admin"]), deleteItem);
```

---

## Troubleshooting

### Database Connection Error

```bash
# Check database connection
mysql -u user -p database_name

# Check environment variables
echo $DB_HOST, $DB_USER, $DB_NAME
```

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

### JWT Token Error

- Ensure token is in `Authorization: Bearer <token>` format
- Check JWT_SECRET matches in .env
- Check token hasn't expired

### File Upload Error

- Check upload directory permissions
- Ensure `UPLOAD_PATH` directory exists
- Check file size limits in multer config

---

## Resources

- [Express.js Docs](https://expressjs.com/)
- [Sequelize Docs](https://sequelize.org/)
- [JWT Docs](https://jwt.io/)
- [MySQL Docs](https://dev.mysql.com/)

---

**Last Updated:** January 28, 2026  
**Version:** 1.0.0
