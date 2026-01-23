import json
import re
import torch
import pickle
import torch.nn as nn
import torch.optim as optim
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import precision_score, recall_score, f1_score

DATASET_PATH = "dataset.jsonl"
EPOCHS = 30

# ---------------- UTIL ----------------
def clean(text):
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()

def sent_tokenize(text):
    return [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 20]
# -------------------------------------

texts = []
labels = []

# Load dataset
with open(DATASET_PATH) as f:
    for line in f:
        data = json.loads(line)
        sentences = sent_tokenize(clean(data["text"]))
        texts.extend(sentences)
        labels.extend(data["labels"])

assert len(texts) == len(labels), "Jumlah kalimat dan label tidak sama"

# Tensor label
y = torch.tensor(labels, dtype=torch.float32).unsqueeze(1)

# ---------------- VECTORIZATION ----------------
vectorizer = TfidfVectorizer(
    max_features=1000,
    ngram_range=(1, 2),
    sublinear_tf=True
)

X = vectorizer.fit_transform(texts).toarray()
X = torch.tensor(X, dtype=torch.float32)

INPUT_DIM = X.shape[1]
print("📐 Input dimension:", INPUT_DIM)

with open("vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)

# ---------------- MODEL ----------------
class Summarizer(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1)
        )

    def forward(self, x):
        return self.net(x)  # NO sigmoid here

model = Summarizer(INPUT_DIM)

# ---------------- LOSS (HANDLE IMBALANCE) ----------------
pos = sum(labels)
neg = len(labels) - pos
pos_weight = torch.tensor([neg / max(pos, 1)])

criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
optimizer = optim.Adam(model.parameters(), lr=0.001)

# ---------------- TRAINING ----------------
for epoch in range(EPOCHS):
    optimizer.zero_grad()
    logits = model(X)
    loss = criterion(logits, y)
    loss.backward()
    optimizer.step()

    print(f"Epoch {epoch+1}/{EPOCHS} - Loss: {loss.item():.4f}")

# ---------------- EVALUATION ----------------
with torch.no_grad():
    probs = torch.sigmoid(model(X))
    preds = (probs >= 0.5).int()

precision = precision_score(y.numpy(), preds.numpy(), zero_division=0)
recall = recall_score(y.numpy(), preds.numpy(), zero_division=0)
f1 = f1_score(y.numpy(), preds.numpy(), zero_division=0)

print("\n✅ Training selesai")
print(f"Precision: {precision:.2f}")
print(f"Recall   : {recall:.2f}")
print(f"F1 Score : {f1:.2f}")

# Save model
torch.save(model.state_dict(), "model.pt")
