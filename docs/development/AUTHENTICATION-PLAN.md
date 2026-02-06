# Authentication Strategy

## ✅ Current Setup (CORRECT)

### Public Routes (No Token Required)
Semua endpoint GET untuk menampilkan data TIDAK memerlukan authentication:

#### Posts
- ✅ `GET /api/posts` - List all posts (public)
- ✅ `GET /api/posts/:slug` - Get single post (public)
- ✅ `GET /api/posts/popular` - Popular posts (public)
- ✅ `GET /api/posts/recent` - Recent posts (public)

#### Categories
- ✅ `GET /api/categories` - List all categories (public)
- ✅ `GET /api/categories/:slug` - Get single category (public)
- ✅ `GET /api/categories/:slug/posts` - Posts by category (public)

#### Auth
- ✅ `POST /api/auth/login` - Login (public)
- ✅ `POST /api/auth/register` - Register (public)

### Protected Routes (Token Required) - For Dashboard Only

Endpoint yang perlu authentication (untuk dashboard admin):

#### Posts Management
- 🔒 `POST /api/posts` - Create post (requires auth)
- 🔒 `PUT /api/posts/:id` - Update post (requires auth)
- 🔒 `DELETE /api/posts/:id` - Delete post (requires auth + admin)

#### Categories Management
- 🔒 `POST /api/categories` - Create category (requires auth + admin)
- 🔒 `PUT /api/categories/:id` - Update category (requires auth + admin)
- 🔒 `DELETE /api/categories/:id` - Delete category (requires auth + admin)

## 📝 Implementation Plan

### 1. Middleware Authentication (Future)

File: `/middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');

// Verify JWT token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, isAdmin };
```

### 2. Protected Routes (Future)

Update `routes/posts.js`:
```javascript
const { authenticate, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/', getAllPosts);
router.get('/popular', getPopularPosts);
router.get('/recent', getRecentPosts);
router.get('/:slug', getPostBySlug);

// Protected routes
router.post('/', authenticate, createPost);
router.put('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, isAdmin, deletePost);
```

### 3. Frontend Implementation

#### Public Pages (No Auth)
- Homepage
- News page
- Detail page
- Category page

#### Dashboard Pages (Requires Auth)
- Login page
- Dashboard
- Add/Edit Post
- Add/Edit Category
- User Management

#### Auth Context
```typescript
// src/contexts/AuthContext.tsx
export const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  return { token, user, login, logout };
};
```

#### Protected API Calls (Dashboard Only)
```typescript
// src/services/admin.ts
const createPost = async (postData) => {
  const token = localStorage.getItem('token');
  return api.post('/posts', postData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};
```

## ✅ Current Status

**Public Routes:** ✅ Working - No auth required
**Protected Routes:** 🟡 Temporarily public (for development)
**Dashboard Auth:** ⏳ To be implemented when needed

## 🎯 Next Steps (When Needed)

1. Create `/middleware/auth.js` with JWT verification
2. Update routes to use authentication middleware
3. Create AuthContext in frontend
4. Implement login/logout in frontend
5. Add protected routes in frontend (PrivateRoute component)
6. Add token to API calls for dashboard operations

## 📝 Notes

- Public endpoints (GET) tidak perlu token
- Token hanya untuk operasi CRUD (POST, PUT, DELETE) di dashboard
- User roles: administrator, editor, author, contributor, subscriber
- JWT secret stored in `.env` file
