import re
import sys
import torch
import pickle
import torch.nn as nn

# ================= UTIL =================
def clean(text):
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def sent_tokenize(text):
    # Ambil kalimat yang cukup panjang agar tidak noise
    sentences = [s.strip() for s in re.split(r'[.!?]', text)]
    return [s for s in sentences if len(s) > 25]
# =======================================

# ================= LOAD VECTORIZER =================
with open("vectorizer.pkl", "rb") as f:
    vectorizer = pickle.load(f)

INPUT_DIM = len(vectorizer.get_feature_names_out())

# ================= MODEL (HARUS SAMA DENGAN TRAINING) =================
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
        return self.net(x)

model = Summarizer(INPUT_DIM)
model.load_state_dict(torch.load("model.pt", map_location="cpu"))
model.eval()

# ================= NARASI GENERAL =================
def build_narrative(sentences):
    if not sentences:
        return ""

    def lc(s):
        return s[0].lower() + s[1:] if len(s) > 1 else s.lower()

    narrative = []

    # Fakta utama
    narrative.append(sentences[0])

    # Penjelasan
    if len(sentences) > 1:
        narrative.append("Selain itu, " + lc(sentences[1]))

    # Dampak / konteks
    if len(sentences) > 2:
        narrative.append("Sebagai dampaknya, " + lc(sentences[2]))

    # Pastikan titik di akhir
    return ". ".join(narrative).rstrip(".") + "."

# ================= SUMMARIZER UTAMA =================
def summarize(text, mode="medium"):
    text = clean(text)
    sentences = sent_tokenize(text)

    if not sentences:
        return ""

    # Atur panjang ringkasan
    if mode == "short":
        top_n = 2
    elif mode == "long":
        top_n = max(5, len(sentences) // 8)
    else:  # medium (default)
        top_n = max(3, len(sentences) // 10)

    top_n = min(top_n, len(sentences))

    X = vectorizer.transform(sentences).toarray()
    X = torch.tensor(X, dtype=torch.float32)

    with torch.no_grad():
        scores = torch.sigmoid(model(X)).numpy().flatten()

    ranked = sorted(
        [(scores[i], i, sentences[i]) for i in range(len(sentences))],
        reverse=True
    )

    selected = sorted(ranked[:top_n], key=lambda x: x[1])
    important_sentences = [s[2] for s in selected]

    return build_narrative(important_sentences)

# ================= ENTRY POINT =================
if __name__ == "__main__":
    # Kalau dipanggil dari backend → baca dari stdin
    input_text = sys.stdin.read().strip()

    # Kalau tidak ada stdin, pakai contoh
    if not input_text:
        input_text = """
        Banjir merendam sejumlah wilayah di Kulon Progo akibat hujan deras sejak malam hari.
        Air sungai meluap dan menggenangi permukiman warga.
        Sejumlah aktivitas masyarakat terganggu akibat kondisi tersebut.
        Warga diminta waspada terhadap potensi banjir susulan.
        """

    print(summarize(input_text, mode="medium"))
