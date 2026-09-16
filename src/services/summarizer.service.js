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

  const candidateModels = [
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-3.2-3b-preview",
    "deepseek-r1-distill-llama-70b",
  ];

  for (const apiKey of apiKeys) {
    const groq = getGroqClient(apiKey);
    if (!groq) continue;

    for (const model of candidateModels) {
      try {
        const response = await groq.chat.completions.create({
          model,
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
        if (
          error.status === 404 ||
          error.status === 400 ||
          error.message?.includes("model_not_found") ||
          error.message?.includes("decommissioned")
        ) {
          continue;
        }
        console.error(
          `Groq API error on model ${model}:`,
          error.message,
        );
      }
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
