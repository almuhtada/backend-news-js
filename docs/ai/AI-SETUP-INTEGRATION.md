# AI Backend Setup & Integration Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Python Dependencies

```bash
cd backend-news-express

# Install required packages
pip install torch scikit-learn groq

# Or from requirements.txt (if exists)
pip install -r requirements.txt
```

### Step 2: Setup Groq API Key

```bash
# Get API key from https://console.groq.com

# Option 1: Set environment variable
export GROQ_API_KEY="your_api_key_here"

# Option 2: Create .env file
echo "GROQ_API_KEY=your_api_key_here" >> .env

# Option 3: Set in docker-compose.yml
environment:
  - GROQ_API_KEY=your_api_key_here
```

### Step 3: Test AI Model

```bash
cd ai-news

# Test inference
echo "Presiden Indonesia mengumumkan program pembangunan infrastruktur baru." | python infer.py

# Output should be a summary of the input text
```

### Step 4: Register API Route

```javascript
// In app.js
const aiRoutes = require("./routes/ai");

app.use("/api/ai", aiRoutes);
```

### Step 5: Test API Endpoint

```bash
curl -X POST http://localhost:5000/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Presiden Indonesia mengumumkan program pembangunan infrastruktur baru di Jakarta sebagai bagian dari strategi pengembangan ekonomi nasional yang berkelanjutan."
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "excerpt": "Presiden Indonesia mengumumkan...",
#     "length": 150,
#     "sourceLength": 160
#   }
# }
```

---

## 📊 Complete Integration Steps

### Step 1: Project Structure Verification

```
backend-news-express/
├── app.js                    ← Main Express app
├── package.json              ← Dependencies
├── .env                      ← Environment variables
├── ai-news/
│   ├── AI-BACKEND-DOCUMENTATION.md
│   ├── train.py              ← Training script
│   ├── infer.py              ← Inference script
│   ├── model.pt              ← Trained model (binary)
│   ├── vectorizer.pkl        ← Vectorizer (binary)
│   └── dataset.jsonl         ← Training data
└── routes/
    ├── posts.js
    ├── categories.js
    └── ai.js                 ← NEW: AI routes
```

### Step 2: Install Dependencies

**Option A: Pip (Direct Installation)**

```bash
pip install torch==2.0.0
pip install scikit-learn==1.3.0
pip install groq==0.4.1
```

**Option B: Requirements.txt**

Create `requirements.txt`:

```
torch==2.0.0
scikit-learn==1.3.0
groq==0.4.1
```

Then install:

```bash
pip install -r requirements.txt
```

**Option C: Conda (Alternative)**

```bash
conda create -n news-ai python=3.10
conda activate news-ai
conda install pytorch scikit-learn
pip install groq
```

### Step 3: Create AI Routes

**File:** `routes/ai.js`

```javascript
const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");

// Middleware: validate content
const validateContent = (req, res, next) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({
      error: "Content is required",
    });
  }

  if (content.length < 100) {
    return res.status(400).json({
      error: "Content must be at least 100 characters",
    });
  }

  if (content.length > 50000) {
    return res.status(400).json({
      error: "Content too long (max 50000 characters)",
    });
  }

  next();
};

/**
 * POST /api/ai/summarize
 * Generate article summary using Groq LLM
 *
 * Request:
 * {
 *   "content": "Full article text here..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "excerpt": "Summary text...",
 *     "length": 150,
 *     "sourceLength": 2000
 *   }
 * }
 */
router.post("/summarize", validateContent, async (req, res) => {
  try {
    const { content } = req.body;

    console.log(`[AI] Summarizing ${content.length} characters...`);

    const summary = await runPythonScript("infer.py", content);

    res.json({
      success: true,
      data: {
        excerpt: summary,
        length: summary.length,
        sourceLength: content.length,
      },
    });
  } catch (error) {
    console.error("[AI] Summarization error:", error);

    res.status(500).json({
      error: "Summarization failed",
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/health
 * Check if AI service is working
 */
router.post("/health", async (req, res) => {
  try {
    const testText =
      "Ini adalah teks tes untuk memverifikasi sistem AI berfungsi dengan baik.";

    const result = await runPythonScript("infer.py", testText);

    res.json({
      success: true,
      status: "AI service is operational",
      testResult: result.substring(0, 100) + "...",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "AI service is down",
      error: error.message,
    });
  }
});

/**
 * Helper: Run Python script
 * @param {string} scriptName - Name of Python script
 * @param {string} input - Input text to process
 * @returns {Promise<string>} - Output from Python script
 */
function runPythonScript(scriptName, input) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "..", "ai-news", scriptName);

    const pythonProcess = spawn("python3", [scriptPath]);

    let output = "";
    let errorOutput = "";

    // Capture stdout
    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    // Capture stderr
    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    // Handle process close
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(errorOutput || "Python script failed"));
      } else {
        resolve(output.trim());
      }
    });

    // Handle timeout
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      reject(new Error("Python script timeout (>30s)"));
    }, 30000);

    // Send input and close stdin
    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();

    // Clear timeout on success
    pythonProcess.on("close", () => clearTimeout(timeout));
  });
}

module.exports = router;
```

### Step 4: Register Route in app.js

```javascript
// app.js
const express = require("express");
const app = express();

// ... existing middleware ...

// AI Routes
const aiRoutes = require("./routes/ai");
app.use("/api/ai", aiRoutes);

// ... rest of app ...

module.exports = app;
```

### Step 5: Setup Environment Variables

**File:** `.env`

```env
# AI Configuration
GROQ_API_KEY=gsk_your_actual_api_key_here

# Optional: Python path (if not in PATH)
# PYTHON_PATH=/usr/bin/python3
```

### Step 6: Update package.json

```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "ai:train": "python ai-news/train.py",
    "ai:test": "echo 'Ini test' | python ai-news/infer.py"
  },
  "dependencies": {
    "express": "^5.2.1",
    "dotenv": "^16.0.0"
  }
}
```

---

## 🔗 Using AI in Your Controllers

### Example 1: Auto-Generate Excerpt on Post Creation

**File:** `controller/postController.js`

```javascript
const axios = require("axios");

exports.createPost = async (req, res) => {
  try {
    const { title, content, category } = req.body;

    // Validate input
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    // Generate excerpt using AI
    let excerpt = null;
    try {
      const response = await axios.post(
        "http://localhost:5000/api/ai/summarize",
        {
          content: content,
        },
      );

      if (response.data.success) {
        excerpt = response.data.data.excerpt;
      }
    } catch (aiError) {
      console.warn("[Warning] AI summarization failed:", aiError.message);
      // Fallback: take first 150 characters
      excerpt = content.substring(0, 150) + "...";
    }

    // Create post with AI-generated excerpt
    const post = await Post.create({
      title,
      content,
      excerpt: excerpt || content.substring(0, 150),
      category,
    });

    res.json({
      success: true,
      data: post,
      aiGenerated: !!excerpt,
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ error: error.message });
  }
};
```

### Example 2: Add AI Summary Endpoint

**File:** `routes/posts.js`

```javascript
const express = require("express");
const router = express.Router();
const axios = require("axios");

/**
 * POST /api/posts/:id/summarize
 * Generate summary for existing post
 */
router.post("/:id/summarize", async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Call AI service
    const response = await axios.post(
      "http://localhost:5000/api/ai/summarize",
      {
        content: post.content,
      },
    );

    if (!response.data.success) {
      throw new Error("AI summarization failed");
    }

    const excerpt = response.data.data.excerpt;

    // Update post with AI-generated excerpt
    post.excerpt = excerpt;
    await post.save();

    res.json({
      success: true,
      data: {
        postId: post.id,
        excerpt: post.excerpt,
      },
    });
  } catch (error) {
    console.error("Summarize error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## 🧪 Testing

### Test 1: API Health Check

```bash
curl -X POST http://localhost:5000/api/ai/health \
  -H "Content-Type: application/json"

# Expected output:
# {
#   "success": true,
#   "status": "AI service is operational",
#   "testResult": "Ini adalah teks tes untuk memverifikasi..."
# }
```

### Test 2: Summarization

```bash
curl -X POST http://localhost:5000/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Presiden Indonesia mengumumkan program pembangunan infrastruktur baru di Jakarta. Program ini dirancang untuk meningkatkan ekonomi nasional. Investasi besar akan dialokasikan untuk proyek ini. Warga Indonesia sangat antusias dengan pengumuman tersebut."
  }'

# Expected output:
# {
#   "success": true,
#   "data": {
#     "excerpt": "Presiden Indonesia mengumumkan...",
#     "length": 145,
#     "sourceLength": 302
#   }
# }
```

### Test 3: Error Handling

```bash
# Test with empty content
curl -X POST http://localhost:5000/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "content": ""
  }'

# Expected output:
# {
#   "error": "Content is required"
# }
```

---

## 🐛 Debugging

### Enable Logging

**File:** `routes/ai.js`

```javascript
// Add detailed logging
const DEBUG = process.env.DEBUG === "true";

router.post("/summarize", validateContent, async (req, res) => {
  const startTime = Date.now();

  if (DEBUG) {
    console.log("[AI] Request received");
    console.log("[AI] Content length:", req.body.content.length);
  }

  try {
    const summary = await runPythonScript("infer.py", req.body.content);

    const endTime = Date.now();

    if (DEBUG) {
      console.log("[AI] Processing time:", endTime - startTime, "ms");
      console.log("[AI] Summary length:", summary.length);
    }

    res.json({
      success: true,
      data: {
        excerpt: summary,
        processingTime: endTime - startTime,
      },
    });
  } catch (error) {
    console.error("[AI] Error:", error);
    res.status(500).json({ error: error.message });
  }
});
```

### Enable Debug Mode

```bash
# Run with debug logging
DEBUG=true npm start

# Check Python path
which python3
python3 --version

# Test Python directly
python3 ai-news/infer.py < /tmp/test.txt

# Check environment variable
echo $GROQ_API_KEY
```

---

## 📊 Monitoring

### Performance Metrics

**File:** `routes/ai.js`

```javascript
const aiStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalProcessingTime: 0,
  avgProcessingTime: 0,
};

router.post("/summarize", validateContent, async (req, res) => {
  const startTime = Date.now();
  aiStats.totalRequests++;

  try {
    const summary = await runPythonScript("infer.py", req.body.content);
    aiStats.successfulRequests++;

    const processingTime = Date.now() - startTime;
    aiStats.totalProcessingTime += processingTime;
    aiStats.avgProcessingTime =
      aiStats.totalProcessingTime / aiStats.successfulRequests;

    res.json({
      success: true,
      data: {
        excerpt: summary,
        processingTime,
      },
    });
  } catch (error) {
    aiStats.failedRequests++;
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/stats
 * Get AI service statistics
 */
router.get("/stats", (req, res) => {
  res.json({
    stats: aiStats,
    successRate:
      ((aiStats.successfulRequests / aiStats.totalRequests) * 100).toFixed(2) +
      "%",
  });
});
```

---

## 🚀 Deployment

### Docker Setup

**File:** `Dockerfile`

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy backend files
COPY backend-news-express/ .

# Install Node dependencies
RUN npm install

# Expose port
EXPOSE 5000

# Set environment variables
ENV GROQ_API_KEY=${GROQ_API_KEY}

# Start server
CMD ["npm", "start"]
```

### Docker Compose

**File:** `docker-compose.yml`

```yaml
version: "3.8"

services:
  backend:
    build: ./backend-news-express
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - GROQ_API_KEY=${GROQ_API_KEY}
    volumes:
      - ./backend-news-express/ai-news:/app/ai-news:ro
    depends_on:
      - db

  db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=news_db
    ports:
      - "3306:3306"

volumes:
  db-data:
```

### Deploy Commands

```bash
# Build Docker image
docker build -t news-ai-backend ./backend-news-express

# Run with Groq API key
docker run -p 5000:5000 \
  -e GROQ_API_KEY="your_api_key_here" \
  news-ai-backend

# Or using docker-compose
GROQ_API_KEY="your_api_key_here" docker-compose up
```

---

## ✅ Checklist

Before going live:

- [ ] Python dependencies installed
- [ ] GROQ_API_KEY set in environment
- [ ] AI routes registered in app.js
- [ ] Health check endpoint working
- [ ] Summarization endpoint tested
- [ ] Logging enabled
- [ ] Error handling in place
- [ ] Docker image built and tested
- [ ] Database connected
- [ ] Frontend updated to use /api/ai endpoints

---

**Last Updated:** January 28, 2026  
**Version:** 1.0.0  
**Status:** ✅ Ready for Integration
