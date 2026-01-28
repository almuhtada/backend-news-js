# Backend Development Guide

## 📋 Development Setup

### Prerequisites

- Node.js v18+
- MySQL v8+
- npm or yarn
- Git
- Postman (untuk API testing)

### Initial Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd backend-news-express

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Edit .env dengan credentials lokal
nano .env

# 5. Setup database
npm run migrate
npm run seed

# 6. Start development server
npm run dev
```

---

## Environment Setup

### .env Configuration

```env
# Server
NODE_ENV=development
PORT=3001
HOST=localhost

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=news_db
DB_PORT=3306
DB_DIALECT=mysql

# Authentication
JWT_SECRET=your_development_secret_key
JWT_EXPIRE=7d

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=true

# API Keys (optional)
# GROQ_API_KEY=your_key
# TELEGRAM_BOT_TOKEN=your_token

# Logging
LOG_LEVEL=debug
LOG_DIR=./logs
```

---

## Database Setup

### MySQL Installation

```bash
# macOS (Homebrew)
brew install mysql
brew services start mysql

# Ubuntu/Debian
sudo apt-get install mysql-server
sudo mysql_secure_installation

# Windows
# Download from mysql.com
```

### Create Database & User

```bash
# Login to MySQL
mysql -u root -p

# Run in MySQL:
```

```sql
-- Create database
CREATE DATABASE news_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'news_user'@'localhost' IDENTIFIED BY 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON news_db.* TO 'news_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

### Run Migrations

```bash
# Run all migrations
npm run migrate:all

# Run specific migration
npm run migrate

# Sync database (creates tables)
npm run sync:db
```

### Seed Sample Data

```bash
# Seed sample data
npm run seed

# Seed admin user
node seedAdminUser.js

# Seed about data
node seedAboutDataSimple.js

# Seed page contents
node seed-page-contents.js
```

### Clean Sample Data

```bash
npm run clean:sample
```

---

## Development Workflow

### File Structure Best Practices

```
backend-news-express/
├── controller/
│   └── [feature]Controller.js       # Business logic
├── routes/
│   └── [feature].js                 # API routes
├── schema/
│   └── [feature].js                 # Database model
├── middleware/
│   └── [custom].js                  # Custom middleware
├── services/
│   └── [feature]Service.js          # Reusable services
├── config/
│   └── [config].js                  # Configuration
└── scripts/
    └── [utility].js                 # Utility scripts
```

### Adding New Endpoint

1. **Create Controller** (`controller/featureController.js`)

```javascript
const { Feature } = require("../schema");

exports.getFeatures = async (req, res) => {
  try {
    const features = await Feature.findAll();
    res.json({ success: true, data: features });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getFeature = async (req, res) => {
  try {
    const feature = await Feature.findByPk(req.params.id);
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "Feature not found",
      });
    }
    res.json({ success: true, data: feature });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.createFeature = async (req, res) => {
  try {
    const feature = await Feature.create(req.body);
    res.status(201).json({
      success: true,
      data: feature,
      message: "Feature created successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
```

2. **Create Routes** (`routes/feature.js`)

```javascript
const express = require("express");
const router = express.Router();
const {
  getFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
} = require("../controller/featureController");
const { authenticate, authorize } = require("../middleware/auth");

// Public routes
router.get("/", getFeatures);
router.get("/:id", getFeature);

// Protected routes (require authentication)
router.post("/", authenticate, createFeature);
router.put("/:id", authenticate, updateFeature);

// Admin routes (require admin role)
router.delete("/:id", authenticate, authorize(["admin"]), deleteFeature);

module.exports = router;
```

3. **Create Model** (`schema/feature.js`)

```javascript
module.exports = (sequelize, DataTypes) => {
  const Feature = sequelize.define(
    "Feature",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        defaultValue: "active",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "features",
      timestamps: true,
    },
  );

  return Feature;
};
```

4. **Register Route** (in `app.js`)

```javascript
const featureRoutes = require("./routes/feature");

// Add after other routes
app.use("/api/features", featureRoutes);
```

5. **Update Swagger** (in `swagger.js`)

```javascript
/**
 * @swagger
 * /api/features:
 *   get:
 *     summary: Get all features
 *     responses:
 *       200:
 *         description: List of features
 */

/**
 * @swagger
 * /api/features/{id}:
 *   get:
 *     summary: Get feature by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 */
```

---

## API Testing

### Using REST Client

Install VS Code extension: REST Client

Create `test.http`:

```http
### Get all posts
GET http://localhost:3001/api/posts

### Get single post
GET http://localhost:3001/api/posts/1

### Login
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}

### Create post (with token)
POST http://localhost:3001/api/posts
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "title": "New Post",
  "content": "Post content here",
  "categoryId": 1
}
```

### Using Postman

1. Import `postman_collection.json`
2. Set environment variables:
   - `base_url` = http://localhost:3001/api
   - `token` = (set after login)
3. Use Postman to test endpoints

### Using cURL

```bash
# Get posts
curl http://localhost:3001/api/posts

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Create post (with token)
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"New Post","content":"Content","categoryId":1}'
```

---

## Common Tasks

### Add Authentication to Route

```javascript
// routes/feature.js
const { authenticate, authorize } = require("../middleware/auth");

// Require authentication only
router.post("/", authenticate, createFeature);

// Require admin role
router.delete("/:id", authenticate, authorize(["admin"]), deleteFeature);

// Multiple roles
router.put("/:id", authenticate, authorize(["admin", "editor"]), updateFeature);
```

### Handle File Upload

```javascript
// routes/feature.js
const upload = require("../middleware/upload");

// Single file
router.post("/upload", upload.single("file"), (req, res) => {
  res.json({
    success: true,
    filename: req.file.filename,
  });
});

// Multiple files
router.post("/upload-multiple", upload.array("files", 5), (req, res) => {
  const filenames = req.files.map((f) => f.filename);
  res.json({
    success: true,
    filenames,
  });
});
```

### Add Validation

```javascript
// controller/featureController.js
const validateInput = (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Name is required",
    });
  }

  if (name.length < 3) {
    return res.status(400).json({
      success: false,
      message: "Name must be at least 3 characters",
    });
  }
};

exports.createFeature = async (req, res) => {
  // Validate
  const error = validateInput(req, res);
  if (error) return;

  // Create feature
  try {
    const feature = await Feature.create(req.body);
    res.status(201).json({
      success: true,
      data: feature,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
```

### Error Handling

```javascript
// Create custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Use in controller
exports.getFeature = async (req, res, next) => {
  try {
    const feature = await Feature.findByPk(req.params.id);

    if (!feature) {
      throw new AppError("Feature not found", 404);
    }

    res.json({ success: true, data: feature });
  } catch (error) {
    next(error);
  }
};

// Error middleware
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message,
  });
});
```

### Database Query Examples

```javascript
// Find all
const features = await Feature.findAll();

// Find with limit and offset
const features = await Feature.findAll({
  limit: 10,
  offset: 0,
});

// Find by primary key
const feature = await Feature.findByPk(id);

// Find by attribute
const feature = await Feature.findOne({
  where: { slug: "feature-name" },
});

// Find with include (relationships)
const post = await Post.findByPk(postId, {
  include: ["Comments", "Categories"],
});

// Create
const feature = await Feature.create({ name: "New" });

// Update
await feature.update({ name: "Updated" });

// Delete
await feature.destroy();

// Count
const count = await Feature.count();

// Query with where
const features = await Feature.findAll({
  where: { status: "active" },
});
```

---

## Debugging

### Console Logging

```javascript
// Basic logging
console.log("Message");
console.error("Error");
console.warn("Warning");

// Object logging
console.log("Data:", JSON.stringify(data, null, 2));

// Timing
console.time("operation");
// ... code ...
console.timeEnd("operation");
```

### VSCode Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/app.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

Run: F5 or Debug menu → Start Debugging

### Network Debugging

```bash
# Monitor network requests
# In browser DevTools → Network tab

# Or use curl with verbose
curl -v http://localhost:3001/api/posts

# Or use httpie
http GET http://localhost:3001/api/posts
```

---

## Performance

### Database Optimization

```javascript
// Use indexes for frequently queried columns
// In migration or schema:
Post.findAll({
  attributes: ["id", "title", "slug"],
  raw: true, // Faster for large datasets
});

// Limit results
Post.findAll({
  limit: 10,
  offset: 0,
});

// Select specific columns
Post.findAll({
  attributes: ["id", "title"],
});
```

### Caching

```javascript
// Simple in-memory cache
const cache = {};

exports.getPosts = async (req, res) => {
  const cacheKey = "posts-all";

  if (cache[cacheKey]) {
    return res.json({
      success: true,
      data: cache[cacheKey],
      cached: true,
    });
  }

  const posts = await Post.findAll();
  cache[cacheKey] = posts;

  res.json({
    success: true,
    data: posts,
  });
};
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with Jest
npm run jest

# Run single test file
npm test -- test/api.test.js

# Run with coverage
npm test -- --coverage
```

### Writing Tests

```javascript
// test/posts.test.js
const request = require("supertest");
const app = require("../app");

describe("Posts API", () => {
  it("should get all posts", async () => {
    const response = await request(app).get("/api/posts").expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("should create a post", async () => {
    const response = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Post",
        content: "Test content",
        categoryId: 1,
      })
      .expect(201);

    expect(response.body.data).toHaveProperty("id");
  });
});
```

---

## Useful Commands

```bash
# Development
npm run dev              # Start with auto-reload

# Database
npm run migrate          # Run migrations
npm run seed             # Seed sample data
npm run clean:sample     # Clean sample data
npm run sync:db          # Sync database

# Testing
npm test                 # Run tests
npm run jest             # Run Jest tests

# Production
npm start                # Start server
npm run jest             # Run tests before deploy
```

---

## Troubleshooting

### Database Connection Failed

```bash
# Check MySQL is running
sudo systemctl status mysql

# Check connection
mysql -u user -p -h localhost database_name

# Check environment variables
echo $DB_HOST $DB_USER $DB_NAME
```

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### CORS Error

```javascript
// In app.js, ensure CORS is configured
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: true,
  }),
);
```

### File Upload Error

```bash
# Check upload directory exists
mkdir -p uploads

# Check permissions
chmod 755 uploads

# Check file size limit in .env
UPLOAD_MAX_FILE_SIZE=5242880
```

---

**Last Updated:** January 28, 2026
