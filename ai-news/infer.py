import sys
import os
from groq import Groq

# ================= GROQ AI SUMMARIZER =================
# Menggunakan LLM untuk meringkas berita dengan lebih pintar

def summarize_with_ai(text):
    """Ringkas berita menggunakan Groq AI (Llama/Mixtral)"""

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return fallback_summarize(text)

    try:
        client = Groq(api_key=api_key)

        prompt = f"""Kamu adalah asisten yang ahli meringkas berita dalam Bahasa Indonesia.

Tugas: Ringkas berita berikut menjadi 2-4 kalimat yang padat dan informatif.

Aturan:
- Tangkap poin utama: siapa, apa, kapan, di mana, mengapa
- Gunakan bahasa yang jelas dan formal
- Jangan tambahkan informasi yang tidak ada di berita asli
- Jangan gunakan kata "Ringkasan:" atau label apapun di awal
- Langsung tulis ringkasannya saja

Berita:
{text}

Ringkasan:"""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Model gratis dan cepat
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lebih deterministik
            max_tokens=300
        )

        summary = response.choices[0].message.content.strip()
        return summary

    except Exception as e:
        print(f"Groq API error: {e}", file=sys.stderr)
        return fallback_summarize(text)

def fallback_summarize(text):
    """Fallback jika API gagal - ambil 3 kalimat pertama"""
    import re
    text = re.sub(r"\s+", " ", text).strip()
    # Protect angka dengan titik (mis: 15.30)
    text = re.sub(r'(\d)\.(\d)', r'\1<DOT>\2', text)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.replace('<DOT>', '.').strip() for s in sentences if len(s) > 20]

    # Ambil 3 kalimat pertama sebagai fallback
    selected = sentences[:3]
    result = " ".join(selected)
    if result and not result.endswith(('.', '!', '?')):
        result += '.'
    return result

# ================= ENTRY POINT =================
if __name__ == "__main__":
    input_text = sys.stdin.read().strip()

    if not input_text:
        input_text = """
        Banjir merendam sejumlah wilayah di Kulon Progo akibat hujan deras sejak malam hari.
        Air sungai meluap dan menggenangi permukiman warga.
        Sejumlah aktivitas masyarakat terganggu akibat kondisi tersebut.
        Warga diminta waspada terhadap potensi banjir susulan.
        """

    print(summarize_with_ai(input_text))
