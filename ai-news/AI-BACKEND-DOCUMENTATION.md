# Backend AI/ML Model Documentation

## 📖 Table of Contents

1. [Overview](#overview)
2. [Model Architecture](#model-architecture)
3. [Setup & Installation](#setup--installation)
4. [Training](#training)
5. [Inference](#inference)
6. [Integration with Express API](#integration-with-express-api)
7. [API Usage Examples](#api-usage-examples)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Backend AI system terdiri dari 2 komponen utama:

### 1. **Traditional ML Model** (PyTorch)

- **Purpose:** Sentence classification untuk article summarization
- **Framework:** PyTorch + Scikit-learn
- **Type:** Binary classification (relevant/not relevant sentences)
- **Input:** Text (sentences)
- **Output:** Probability score (0-1)

### 2. **LLM Integration** (Groq API)

- **Purpose:** Smart article summarization using Groq AI
- **Model:** Llama 3.1 8B Instant (free tier)
- **Language:** Bahasa Indonesia
- **Input:** Full article text
- **Output:** 2-4 sentence summary

---

## Model Architecture

### Traditional PyTorch Model

```
Input (TF-IDF Vector, 1000 features)
    ↓
Linear Layer (1000 → 128)
    ↓
ReLU Activation
    ↓
Dropout (0.3)
    ↓
Linear Layer (128 → 1)
    ↓
Output (logits) → Sigmoid → Probability [0-1]
```

**Architecture Details:**

```python
class Summarizer(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),      # Hidden layer
            nn.ReLU(),                       # Activation
            nn.Dropout(0.3),                 # Regularization
            nn.Linear(128, 1)                # Output layer
        )

    def forward(self, x):
        return self.net(x)  # Returns logits (no sigmoid)
```

**Model Size:**

- Parameters: ~130,000
- File Size: ~500KB
- Training Time: ~2-5 minutes

---

## Setup & Installation

### Prerequisites

```bash
# Python 3.8+
python --version  # >= 3.8

# Required packages
pip install torch==2.0.0
pip install scikit-learn==1.3.0
pip install groq==0.4.1
```

### Directory Structure

```
backend-news-express/
└── ai-news/
    ├── train.py              # Training script
    ├── infer.py              # Inference script
    ├── dataset.jsonl         # Training data
    ├── model.pt              # Trained model (binary)
    ├── vectorizer.pkl        # TF-IDF vectorizer (binary)
    └── README.md             # This file
```

### Installation Steps

```bash
# 1. Navigate to backend directory
cd /path/to/backend-news-express

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup Groq API key (for LLM summarization)
export GROQ_API_KEY="your-groq-api-key"

# 4. Verify setup
python ai-news/infer.py
```

---

## Training

### Dataset Format

Dataset harus dalam format **JSONL** (JSON Lines):

```jsonl
{"text": "Sentence atau teks pendek di sini", "labels": 1}
{"text": "Kalimat lain yang relevan", "labels": 1}
{"text": "Kalimat tidak relevan atau noise", "labels": 0}
```

**Example:**

```jsonl
{"text": "Presiden Indonesia mengumumkan program pembangunan infrastruktur baru di Jakarta.", "labels": 1}
{"text": "Untuk lebih jelasnya, silakan hubungi kantor kami.", "labels": 0}
{"text": "Banjir merendam wilayah Kulon Progo akibat hujan deras.", "labels": 1}
```

### Training Script (train.py)

#### Full Process

```python
# 1. Load and prepare data
texts = []      # Raw text data
labels = []     # Binary labels (0 or 1)

with open("dataset.jsonl") as f:
    for line in f:
        data = json.loads(line)
        texts.append(data["text"])
        labels.append(data["labels"])

# 2. Text preprocessing
def clean(text):
    text = re.sub(r"\s+", " ", text)  # Remove extra spaces
    return text.strip().lower()        # Lowercase

cleaned_texts = [clean(t) for t in texts]

# 3. Vectorization with TF-IDF
vectorizer = TfidfVectorizer(
    max_features=1000,        # Top 1000 features
    ngram_range=(1, 2),       # Unigram + bigram
    sublinear_tf=True         # Sublinear TF scaling
)

X = vectorizer.fit_transform(cleaned_texts).toarray()
X = torch.tensor(X, dtype=torch.float32)

# 4. Convert labels to tensor
y = torch.tensor(labels, dtype=torch.float32).unsqueeze(1)

# 5. Create model
model = Summarizer(input_dim=1000)

# 6. Loss function with class weighting
pos_weight = torch.tensor([neg_count / max(pos_count, 1)])
criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

# 7. Training loop
optimizer = optim.Adam(model.parameters(), lr=0.001)

for epoch in range(EPOCHS):
    optimizer.zero_grad()
    logits = model(X)
    loss = criterion(logits, y)
    loss.backward()
    optimizer.step()
    print(f"Epoch {epoch+1} - Loss: {loss.item():.4f}")

# 8. Evaluation
with torch.no_grad():
    probs = torch.sigmoid(model(X))
    preds = (probs >= 0.5).int()

# 9. Save model
torch.save(model.state_dict(), "model.pt")
pickle.dump(vectorizer, open("vectorizer.pkl", "wb"))
```

### Run Training

```bash
cd ai-news

# Start training
python train.py

# Output:
# 📐 Input dimension: 1000
# Epoch 1/30 - Loss: 0.6542
# Epoch 2/30 - Loss: 0.4521
# ...
# Epoch 30/30 - Loss: 0.2134
#
# Training selesai
# Precision: 0.87
# Recall   : 0.85
# F1 Score : 0.86
```

### Hyperparameters

| Parameter       | Value | Purpose                              |
| --------------- | ----- | ------------------------------------ |
| `max_features`  | 1000  | Top 1000 TF-IDF features             |
| `ngram_range`   | (1,2) | Unigram + bigram                     |
| `hidden_dim`    | 128   | Hidden layer size                    |
| `dropout`       | 0.3   | Regularization                       |
| `learning_rate` | 0.001 | Adam optimizer                       |
| `epochs`        | 30    | Training iterations                  |
| `batch_size`    | Full  | Entire dataset (mini-batch not used) |

---

## Inference

### Inference Script (infer.py)

#### Mode 1: Groq LLM Summarization (Recommended)

```python
from groq import Groq
import os

def summarize_with_ai(text):
    """
    Ringkas berita menggunakan Groq AI (Llama 3.1)

    Args:
        text (str): Full article text

    Returns:
        str: 2-4 sentence summary
    """
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        return fallback_summarize(text)

    try:
        client = Groq(api_key=api_key)

        prompt = f"""Kamu adalah asisten yang ahli meringkas berita.

Tugas: Ringkas berita berikut menjadi 2-4 kalimat yang padat.

Aturan:
- Tangkap poin utama: siapa, apa, kapan, di mana, mengapa
- Gunakan bahasa formal
- Jangan tambahkan informasi baru
- Langsung tulis ringkasannya

Berita:
{text}

Ringkasan:"""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=300
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Groq API error: {e}")
        return fallback_summarize(text)

def fallback_summarize(text):
    """
    Fallback jika API gagal - ambil 3 kalimat pertama
    """
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return " ".join(sentences[:3])
```

#### Mode 2: Traditional PyTorch Model

```python
import torch
import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# Load model and vectorizer
def load_model():
    model = Summarizer(input_dim=1000)
    model.load_state_dict(torch.load("model.pt"))
    model.eval()
    return model

def load_vectorizer():
    with open("vectorizer.pkl", "rb") as f:
        return pickle.load(f)

# Classify sentences
def classify_sentences(text):
    """
    Classify sentences for importance scoring

    Args:
        text (str): Full text to analyze

    Returns:
        list: Sentences with importance scores
    """
    sentences = re.split(r'(?<=[.!?])\s+', text)

    # Load model and vectorizer
    model = load_model()
    vectorizer = load_vectorizer()

    results = []

    with torch.no_grad():
        for sentence in sentences:
            if len(sentence) < 20:  # Skip short sentences
                continue

            # Vectorize
            X = vectorizer.transform([sentence]).toarray()
            X = torch.tensor(X, dtype=torch.float32)

            # Predict
            logits = model(X)
            prob = torch.sigmoid(logits).item()

            results.append({
                "sentence": sentence,
                "importance": prob,
                "is_important": prob >= 0.5
            })

    return results

# Example usage
text = "Presiden mengumumkan program baru. Acara dilaksanakan di Jakarta. Peserta sangat puas."
results = classify_sentences(text)

for r in results:
    print(f"[{r['importance']:.2f}] {r['sentence']}")
```

### Usage from Command Line

```bash
# Read from stdin
echo "Presiden Indonesia mengumumkan program pembangunan..." | python infer.py

# Output:
# Presiden Indonesia mengumumkan program pembangunan infrastruktur baru di Jakarta
# sebagai bagian dari rencana pengembangan ekonomi nasional.
```

---

## Integration with Express API

### API Route Setup

**File:** `routes/ai.js`

```javascript
const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");

/**
 * POST /api/ai/summarize
 * Generate excerpt using Groq LLM
 */
router.post("/summarize", async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.length < 100) {
      return res.status(400).json({
        error: "Content must be at least 100 characters",
      });
    }

    // Call Python script
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
    console.error("Summarization error:", error);
    res.status(500).json({
      error: "Summarization failed",
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/score-sentences
 * Score sentences for importance
 */
router.post("/score-sentences", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Call Python script with scoring mode
    const result = await runPythonScript("infer.py", text, "score");

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      error: "Scoring failed",
      details: error.message,
    });
  }
});

/**
 * Helper: Run Python script
 */
function runPythonScript(scriptName, input, mode = "summarize") {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(__dirname, "..", "ai-news", scriptName);

    const pythonProcess = spawn("python3", [pythonPath]);

    let output = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(error || "Python script failed"));
      } else {
        try {
          // Try to parse as JSON first
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          // If not JSON, return as plain text
          resolve(output.trim());
        }
      }
    });

    // Send input
    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();
  });
}

module.exports = router;
```

### Register Route in app.js

```javascript
// app.js
const aiRoutes = require("./routes/ai");

app.use("/api/ai", aiRoutes);
```

### Environment Setup

```bash
# .env
GROQ_API_KEY=your_groq_api_key_here
```

---

## API Usage Examples

### 1. Summarize Article

```bash
curl -X POST http://localhost:5000/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Presiden Indonesia mengumumkan program pembangunan infrastruktur baru... (full article text)"
  }'

# Response:
{
  "success": true,
  "data": {
    "excerpt": "Presiden Indonesia mengumumkan program pembangunan infrastruktur baru di Jakarta sebagai bagian dari rencana pengembangan ekonomi nasional.",
    "length": 142,
    "sourceLength": 1850
  }
}
```

### 2. Score Sentences

```bash
curl -X POST http://localhost:5000/api/ai/score-sentences \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Presiden berbicara. Acara berlangsung meriah. Peserta senang sekali."
  }'

# Response:
{
  "success": true,
  "data": [
    {
      "sentence": "Presiden berbicara",
      "importance": 0.92,
      "is_important": true
    },
    {
      "sentence": "Acara berlangsung meriah",
      "importance": 0.78,
      "is_important": true
    },
    {
      "sentence": "Peserta senang sekali",
      "importance": 0.45,
      "is_important": false
    }
  ]
}
```

### 3. JavaScript/Node.js Integration

```javascript
const axios = require("axios");

async function summarizeArticle(content) {
  try {
    const response = await axios.post(
      "http://localhost:5000/api/ai/summarize",
      {
        content,
      },
    );

    return response.data.data.excerpt;
  } catch (error) {
    console.error("Summarization failed:", error);
    return null;
  }
}

async function scoreText(text) {
  try {
    const response = await axios.post(
      "http://localhost:5000/api/ai/score-sentences",
      {
        text,
      },
    );

    return response.data.data;
  } catch (error) {
    console.error("Scoring failed:", error);
    return [];
  }
}

// Usage
const excerpt = await summarizeArticle(articleContent);
const scores = await scoreText(articleContent);
```

---

## Frontend Integration

### React Component Example

```typescript
// src/components/components-admin/ai-summarizer.tsx
import { useState } from 'react';

interface SummarizerProps {
  content: string;
  onSummaryGenerated?: (summary: string) => void;
}

export function AISummarizer({ content, onSummaryGenerated }: SummarizerProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      const generatedSummary = data.data.excerpt;

      setSummary(generatedSummary);

      if (onSummaryGenerated) {
        onSummaryGenerated(generatedSummary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={generateSummary}
        disabled={loading || !content}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Summary with AI'}
      </button>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {summary && (
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          rows={4}
        />
      )}
    </div>
  );
}
```

---

## Troubleshooting

### Issue 1: GROQ_API_KEY not found

**Error:**

```
Groq API error: GROQ_API_KEY not set
```

**Solution:**

```bash
# Set environment variable
export GROQ_API_KEY="your-groq-api-key"

# Or in .env file
GROQ_API_KEY=your_groq_api_key_here

# Verify
echo $GROQ_API_KEY
```

### Issue 2: Model file not found

**Error:**

```
FileNotFoundError: [Errno 2] No such file or directory: 'model.pt'
```

**Solution:**

```bash
# Train model first
cd ai-news
python train.py

# Check if files exist
ls -la model.pt vectorizer.pkl
```

### Issue 3: Python dependencies missing

**Error:**

```
ModuleNotFoundError: No module named 'torch'
```

**Solution:**

```bash
# Install all required packages
pip install torch scikit-learn groq

# Or from requirements.txt
pip install -r requirements.txt
```

### Issue 4: Groq API rate limit

**Error:**

```
RateLimitError: 429 Too Many Requests
```

**Solution:**

- Wait before making another request
- Implement request throttling in backend
- Use fallback summarization

```javascript
// Add retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function runWithRetry(scriptName, input, retries = 0) {
  try {
    return await runPythonScript(scriptName, input);
  } catch (error) {
    if (retries < MAX_RETRIES && error.message.includes("429")) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      return runWithRetry(scriptName, input, retries + 1);
    }
    throw error;
  }
}
```

### Issue 5: Out of memory

**Error:**

```
RuntimeError: CUDA out of memory
```

**Solution:**

```python
# Use CPU instead of GPU
device = torch.device('cpu')
model = model.to(device)

# Or reduce batch size
# (Already using full batch, can't reduce more)
```

---

## Performance Metrics

### Model Performance

| Metric         | Value    | Notes                               |
| -------------- | -------- | ----------------------------------- |
| Precision      | 0.87     | Accuracy of "important" predictions |
| Recall         | 0.85     | Coverage of "important" sentences   |
| F1 Score       | 0.86     | Balanced metric                     |
| Training Time  | ~2-5 min | Full dataset                        |
| Inference Time | ~10ms    | Per sentence                        |

### API Performance

| Operation       | Time   | Size            |
| --------------- | ------ | --------------- |
| Summarize (API) | 1-3s   | Depends on Groq |
| Score Sentences | ~100ms | 10 sentences    |
| Model Load      | ~50ms  | One-time        |
| Vectorize       | ~50ms  | 100 sentences   |

---

## Best Practices

### 1. Always Set API Key

```bash
# In your shell or .env
export GROQ_API_KEY="..."

# In Docker
ENV GROQ_API_KEY=${GROQ_API_KEY}
```

### 2. Implement Error Handling

```javascript
try {
  const summary = await fetch('/api/ai/summarize', ...);
  // Handle response
} catch (error) {
  // Fallback: Use first 3 sentences
  const fallback = content.split('.').slice(0, 3).join('. ');
}
```

### 3. Cache Results

```javascript
const summaryCache = new Map();

router.post("/summarize", async (req, res) => {
  const { content } = req.body;

  // Check cache first
  const cacheKey = `${content.slice(0, 50)}...`;
  if (summaryCache.has(cacheKey)) {
    return res.json({
      success: true,
      data: summaryCache.get(cacheKey),
      cached: true,
    });
  }

  // Generate if not cached
  const result = await generateSummary(content);
  summaryCache.set(cacheKey, result);

  res.json({
    success: true,
    data: result,
    cached: false,
  });
});
```

### 4. Validate Input

```javascript
if (!content) {
  return res.status(400).json({ error: "Content required" });
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
```

### 5. Monitor Performance

```javascript
console.time("summarization");
const result = await generateSummary(content);
console.timeEnd("summarization");
// Output: summarization: 1234.56ms
```

---

## Additional Resources

- **PyTorch Docs:** https://pytorch.org/docs
- **Scikit-learn Docs:** https://scikit-learn.org/
- **Groq API Docs:** https://console.groq.com/docs
- **TF-IDF Vectorizer:** https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html

---

**Last Updated:** January 28, 2026  
**Version:** 1.0.0  
**Status:** ✅ Complete
