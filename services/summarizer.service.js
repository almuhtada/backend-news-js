const Groq = require("groq-sdk");
require("dotenv").config();

// Lazy initialization - hanya buat client saat diperlukan
let groqClient = null;

function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

exports.generateSummary = async (content) => {
  // Jika tidak ada API key, gunakan fallback
  if (!process.env.GROQ_API_KEY) {
    console.log("GROQ_API_KEY not found, using fallback");
    return fallbackSummarize(content);
  }

  try {
    console.log("Calling Groq API...");
    const groq = getGroqClient();

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: `Kamu adalah asisten yang ahli meringkas berita dalam Bahasa Indonesia.

Tugas: Ringkas berita berikut menjadi 2-4 kalimat yang padat dan informatif.

Aturan:
- Tangkap poin utama: siapa, apa, kapan, di mana, mengapa
- Gunakan bahasa yang jelas dan formal
- Jangan tambahkan informasi yang tidak ada di berita asli
- Jangan gunakan kata "Ringkasan:" atau label apapun di awal
- Langsung tulis ringkasannya saja

Berita:
${content}

Ringkasan:`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const summary = response.choices[0].message.content.trim();
    console.log("Groq API success, summary length:", summary.length);
    return summary;
  } catch (error) {
    console.error("Groq API error:", error.message);
    return fallbackSummarize(content);
  }
};

// Fallback jika API gagal
function fallbackSummarize(text) {
  console.log("Using fallback summarizer");
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  const selected = sentences.slice(0, 3);
  let result = selected.join(" ");
  if (result && !result.match(/[.!?]$/)) {
    result += ".";
  }
  return result;
}
