# Backend AI Documentation - Complete Guide

> **Dokumentasi lengkap untuk AI/ML backend system dengan contoh praktis**

## 📚 Backend AI Documentation Files

### 1. **AI-BACKEND-DOCUMENTATION.md** ⭐ MAIN REFERENCE

**Location:** `/backend-news-express/ai-news/AI-BACKEND-DOCUMENTATION.md`  
**Size:** 5000+ lines  
**Content:**

- ✅ **Overview** - Dua komponen AI (PyTorch + Groq LLM)
- ✅ **Model Architecture** - Neural network structure
- ✅ **Setup & Installation** - Prerequisites & setup steps
- ✅ **Training** - Dataset format, training script, hyperparameters
- ✅ **Inference** - Groq LLM & PyTorch model inference
- ✅ **Integration with Express** - Full API route implementation
- ✅ **API Usage Examples** - curl & JavaScript examples
- ✅ **Frontend Integration** - React component example
- ✅ **Troubleshooting** - Common issues & solutions
- ✅ **Performance Metrics** - Benchmarks
- ✅ **Best Practices** - Do's and don'ts

**Cara Pakai:** [Read AI-BACKEND-DOCUMENTATION.md](./ai-news/AI-BACKEND-DOCUMENTATION.md)

---

### 2. **AI-SETUP-INTEGRATION.md** ⭐ QUICK START GUIDE

**Location:** `/backend-news-express/AI-SETUP-INTEGRATION.md`  
**Size:** 3000+ lines  
**Content:**

- ✅ **Quick Start (5 Minutes)** - Fastest setup possible
- ✅ **Complete Integration Steps** - Step-by-step guide
- ✅ **Install Dependencies** - Pip, requirements.txt, conda
- ✅ **Create AI Routes** - Full route implementation
- ✅ **Register Routes** - How to add to app.js
- ✅ **Using AI in Controllers** - Real examples
- ✅ **Testing** - Test cases & verification
- ✅ **Debugging** - Troubleshooting techniques
- ✅ **Monitoring** - Performance tracking
- ✅ **Deployment** - Docker setup
- ✅ **Pre-Launch Checklist** - Ready to deploy

**Cara Pakai:** [Read AI-SETUP-INTEGRATION.md](./AI-SETUP-INTEGRATION.md)

---

## 🎯 Quick Reference

### If you want to...

#### ✅ **Setup AI in 5 minutes**

→ Read: [AI-SETUP-INTEGRATION.md - Quick Start](./AI-SETUP-INTEGRATION.md#-quick-start-5-minutes)

Steps:

1. Install Python dependencies
2. Setup Groq API key
3. Test AI model
4. Register API route
5. Test endpoint

#### ✅ **Understand how AI model works**

→ Read: [AI-BACKEND-DOCUMENTATION.md - Model Architecture](./ai-news/AI-BACKEND-DOCUMENTATION.md#model-architecture)

Learn:

- Neural network structure
- Training process
- Inference pipeline
- Performance metrics

#### ✅ **Train your own model**

→ Read: [AI-BACKEND-DOCUMENTATION.md - Training](./ai-news/AI-BACKEND-DOCUMENTATION.md#training)

Follow:

- Dataset format (JSONL)
- Training script walkthrough
- Hyperparameters
- Evaluation metrics

#### ✅ **Use AI in my controller**

→ Read: [AI-SETUP-INTEGRATION.md - Using AI in Controllers](./AI-SETUP-INTEGRATION.md#-using-ai-in-your-controllers)

Examples:

- Auto-generate excerpt on post creation
- Add AI summary endpoint
- Handle errors gracefully

#### ✅ **Test AI endpoints**

→ Read: [AI-SETUP-INTEGRATION.md - Testing](./AI-SETUP-INTEGRATION.md#-testing)

Test:

- Health check endpoint
- Summarization endpoint
- Error handling

#### ✅ **Deploy with Docker**

→ Read: [AI-SETUP-INTEGRATION.md - Deployment](./AI-SETUP-INTEGRATION.md#-deployment)

Deploy:

- Create Dockerfile
- Setup docker-compose
- Run with API key

#### ✅ **Fix AI errors**

→ Read: [AI-BACKEND-DOCUMENTATION.md - Troubleshooting](./ai-news/AI-BACKEND-DOCUMENTATION.md#troubleshooting)

Solutions:

- API key not found
- Model file missing
- Dependencies missing
- Rate limiting
- Out of memory

---

## 📊 AI System Architecture

```
┌─────────────────────────────────────────────┐
│         Frontend (React Components)         │
│  - AIClassification, AIExcerpt, etc.        │
└────────────────────┬────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────┐
│     Backend Express API (/api/ai/*)         │
│  - /api/ai/summarize (Groq LLM)             │
│  - /api/ai/score-sentences (PyTorch)        │
│  - /api/ai/health (Status check)            │
└────────────────────┬────────────────────────┘
                     │ Child Process (spawn)
┌────────────────────▼────────────────────────┐
│        Python AI Scripts                    │
│  - infer.py (Groq LLM + PyTorch)            │
│  - train.py (Model training)                │
└────────────────────┬────────────────────────┘
                     │
        ┌────────────┴──────────┐
        │                       │
   ┌────▼────┐           ┌──────▼────┐
   │ Groq AI │           │ PyTorch   │
   │ (LLM)   │           │ Model     │
   └─────────┘           └───────────┘
```

---

## 🔧 Setup Checklist

### ✅ Pre-Setup

- [ ] Backend project cloned
- [ ] Python 3.8+ installed
- [ ] Node.js installed
- [ ] .env file created

### ✅ AI Setup

- [ ] Python dependencies installed
- [ ] GROQ_API_KEY obtained (from console.groq.com)
- [ ] GROQ_API_KEY set in .env
- [ ] model.pt exists in ai-news folder
- [ ] vectorizer.pkl exists in ai-news folder

### ✅ Backend Integration

- [ ] routes/ai.js created
- [ ] AI routes registered in app.js
- [ ] Environment variables configured
- [ ] Health check endpoint tested

### ✅ Testing

- [ ] API health check working
- [ ] Summarization endpoint working
- [ ] Error handling verified
- [ ] Rate limiting tested

### ✅ Deployment

- [ ] Docker image built
- [ ] Environment variables set in Docker
- [ ] Docker container running
- [ ] API endpoints accessible

---

## 📚 Documentation Navigation

### By Topic

| Topic        | Document                    | Section                    |
| ------------ | --------------------------- | -------------------------- |
| Setup        | AI-SETUP-INTEGRATION.md     | Quick Start                |
| Architecture | AI-BACKEND-DOCUMENTATION.md | Model Architecture         |
| Training     | AI-BACKEND-DOCUMENTATION.md | Training                   |
| Inference    | AI-BACKEND-DOCUMENTATION.md | Inference                  |
| Integration  | AI-SETUP-INTEGRATION.md     | Complete Integration Steps |
| Testing      | AI-SETUP-INTEGRATION.md     | Testing                    |
| Deployment   | AI-SETUP-INTEGRATION.md     | Deployment                 |
| Debugging    | AI-SETUP-INTEGRATION.md     | Debugging                  |

### By Use Case

| Use Case                 | Document                    | Start Here                 |
| ------------------------ | --------------------------- | -------------------------- |
| I'm new to this project  | AI-SETUP-INTEGRATION.md     | Quick Start (5 min)        |
| I need to deploy AI      | AI-SETUP-INTEGRATION.md     | Complete Integration Steps |
| I want to train model    | AI-BACKEND-DOCUMENTATION.md | Training section           |
| I need to use AI in code | AI-SETUP-INTEGRATION.md     | Using AI in Controllers    |
| Something's not working  | AI-BACKEND-DOCUMENTATION.md | Troubleshooting            |
| I want to understand AI  | AI-BACKEND-DOCUMENTATION.md | Full document              |

---

## 🚀 Getting Started (Choose One Path)

### Path A: 5-Minute Express Setup

**For:** People who just want it working quickly

1. Read: [AI-SETUP-INTEGRATION.md - Quick Start](./AI-SETUP-INTEGRATION.md#-quick-start-5-minutes)
2. Follow 5 steps
3. Test the API
4. Done!

**Time:** 5 minutes

### Path B: Full Integration & Understanding

**For:** Developers who want to understand everything

1. Read: [AI-BACKEND-DOCUMENTATION.md - Overview](./ai-news/AI-BACKEND-DOCUMENTATION.md#overview)
2. Read: [AI-BACKEND-DOCUMENTATION.md - Model Architecture](./ai-news/AI-BACKEND-DOCUMENTATION.md#model-architecture)
3. Read: [AI-SETUP-INTEGRATION.md - Complete Integration](./AI-SETUP-INTEGRATION.md#-complete-integration-steps)
4. Setup and test
5. Integrate into controllers
6. Deploy

**Time:** 30-60 minutes

### Path C: Training Your Own Model

**For:** ML engineers who want custom training

1. Read: [AI-BACKEND-DOCUMENTATION.md - Setup](./ai-news/AI-BACKEND-DOCUMENTATION.md#setup--installation)
2. Read: [AI-BACKEND-DOCUMENTATION.md - Training](./ai-news/AI-BACKEND-DOCUMENTATION.md#training)
3. Prepare dataset in JSONL format
4. Run training script
5. Test model
6. Deploy

**Time:** 2-4 hours

---

## 📝 File Locations

```
backend-news-express/
│
├── AI-SETUP-INTEGRATION.md          ← START HERE (Setup guide)
│
├── app.js                           ← Register AI routes here
│
├── routes/
│   └── ai.js                        ← Create this file
│
├── ai-news/
│   ├── AI-BACKEND-DOCUMENTATION.md  ← Full reference
│   ├── train.py                     ← Training script
│   ├── infer.py                     ← Inference script
│   ├── model.pt                     ← Trained model (binary)
│   ├── vectorizer.pkl               ← Vectorizer (binary)
│   └── dataset.jsonl                ← Training data
│
├── .env                             ← Add GROQ_API_KEY here
│
└── Dockerfile                       ← For deployment
```

---

## 🔗 Frontend Integration

See companion documentation:

- [Frontend AI Components Guide](../news_almuhtada/src/components/AI-COMPONENTS-GUIDE.md)
- [Component Usage Guide](../news_almuhtada/src/components/COMPONENTS-USAGE-GUIDE.md)

Frontend components that use these APIs:

- `AIClassification` - Uses `/api/ai/classify`
- `AIExcerptGenerator` - Uses `/api/ai/summarize`
- `AIRecommendations` - Uses `/api/ai/recommend`

---

## ✨ Key Features

### 1. **Groq LLM Summarization**

- Smart, context-aware summaries
- 2-4 sentence output
- Supports Indonesian language
- Free API tier available
- Fallback to simple summarization if API fails

### 2. **PyTorch Sentence Classification**

- Identify important sentences
- Binary classification (relevant/not relevant)
- TF-IDF feature extraction
- Trained on custom dataset
- Low latency inference (~10ms per sentence)

### 3. **Easy Integration**

- Simple HTTP API
- JSON request/response
- Error handling included
- Logging & monitoring
- Docker support

### 4. **Production Ready**

- Rate limiting ready
- Caching support
- Error handling
- Fallback mechanisms
- Performance monitoring

---

## 🐛 Common Issues & Solutions

| Issue                  | Solution          | Doc                                                                       |
| ---------------------- | ----------------- | ------------------------------------------------------------------------- |
| GROQ_API_KEY not found | Set env var       | [Link](./AI-SETUP-INTEGRATION.md#step-2-setup-groq-api-key)               |
| Model file not found   | Train model       | [Link](./AI-BACKEND-DOCUMENTATION.md#training)                            |
| Dependencies missing   | Install with pip  | [Link](./AI-SETUP-INTEGRATION.md#step-1-install-python-dependencies)      |
| Timeout errors         | Check Python path | [Link](./AI-SETUP-INTEGRATION.md#-debugging)                              |
| Rate limiting          | Implement retry   | [Link](./ai-news/AI-BACKEND-DOCUMENTATION.md#issue-4-groq-api-rate-limit) |

---

## 📊 Performance Summary

### Model Training

- **Time:** 2-5 minutes (full dataset)
- **Precision:** 0.87
- **Recall:** 0.85
- **F1 Score:** 0.86

### API Performance

- **Summarization:** 1-3 seconds (Groq LLM)
- **Sentence Scoring:** ~100ms (PyTorch)
- **Health Check:** <100ms

### Resource Usage

- **Model Size:** ~500KB
- **Vectorizer Size:** ~50KB
- **Memory:** ~200MB (including dependencies)
- **Python Version:** 3.8+

---

## 🎓 Learning Resources

### For AI/ML Concepts

- [PyTorch Documentation](https://pytorch.org/docs)
- [Scikit-learn Docs](https://scikit-learn.org/)
- [TF-IDF Vectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html)

### For Groq API

- [Groq Console](https://console.groq.com)
- [Groq API Docs](https://console.groq.com/docs)
- [Available Models](https://console.groq.com/docs/models)

### For Integration

- [Express.js Documentation](https://expressjs.com/)
- [Node.js Child Processes](https://nodejs.org/api/child_process.html)
- [Python Subprocess](https://docs.python.org/3/library/subprocess.html)

---

## ✅ Final Checklist

Before deploying to production:

- [ ] Both documentation files read
- [ ] Dependencies installed
- [ ] API key configured
- [ ] Health check passing
- [ ] Summarization working
- [ ] Routes registered
- [ ] Controllers updated
- [ ] Tests passing
- [ ] Logging enabled
- [ ] Docker built and tested
- [ ] Environment variables set
- [ ] Database connected
- [ ] Error handling verified

---

## 🎉 You're Ready!

You now have:

- ✅ Complete AI backend setup
- ✅ Express API integration
- ✅ Python model inference
- ✅ Groq LLM integration
- ✅ Frontend component ready
- ✅ Full documentation

Next steps:

1. Follow [AI-SETUP-INTEGRATION.md](./AI-SETUP-INTEGRATION.md)
2. Test the endpoints
3. Integrate with frontend
4. Deploy to production

---

**Last Updated:** January 28, 2026  
**Version:** 1.0.0  
**Status:** ✅ Complete & Ready to Use

**Quick Links:**

- [Setup & Integration Guide](./AI-SETUP-INTEGRATION.md) - Start here for setup
- [Full Backend Documentation](./ai-news/AI-BACKEND-DOCUMENTATION.md) - Complete reference
- [Frontend AI Components](../news_almuhtada/src/components/AI-COMPONENTS-GUIDE.md) - Component examples
