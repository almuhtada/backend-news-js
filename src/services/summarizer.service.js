const Groq = require("groq-sdk");
require("dotenv").config();

// Lazy initialization - client terpisah agar key utama dan backup dapat dicoba berurutan.
const groqClients = new Map();

function getGroqClient(apiKey) {
  if (!apiKey) return null;
  if (!groqClients.has(apiKey)) {
    groqClients.set(apiKey, new Groq({ apiKey }));
  }
  return groqClients.get(apiKey);
}

exports.generateSummary = async (content) => {
  const apiKeys = [process.env.GROQ_API_KEY, process.env.BACKUP_API_KEY].filter(
    Boolean,
  );

  if (apiKeys.length === 0) {
    return fallbackSummarize(content);
  }

  for (const [index, apiKey] of apiKeys.entries()) {
    try {
      const groq = getGroqClient(apiKey);

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

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error(
        `Groq API error on ${index === 0 ? "primary" : "backup"} key:`,
        error.message,
      );
    }
  }

  return fallbackSummarize(content);
};

// Fallback jika API gagal
function fallbackSummarize(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  const selected = sentences.slice(0, 3);
  let result = selected.join(" ");
  if (result && !result.match(/[.!?]$/)) {
    result += ".";
  }
  return result;
}
