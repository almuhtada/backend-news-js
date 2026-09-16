const Groq = require("groq-sdk");
require("dotenv").config();

const groqClients = new Map();

function getGroqClient(apiKey) {
  if (!apiKey) return null;
  if (!groqClients.has(apiKey)) {
    groqClients.set(apiKey, new Groq({ apiKey }));
  }
  return groqClients.get(apiKey);
}

/**
 * Detect AI probability percentage and analysis for a given text.
 * Returns: { ai_percentage: number, label: string, status: string, analysis: string }
 */
exports.detectAiContent = async (content) => {
  if (!content || typeof content !== "string" || content.trim().length < 50) {
    return {
      ai_percentage: 0,
      label: "Teks terlalu pendek",
      status: "LOW",
      analysis: "Panjang artikel minimal 50 karakter untuk dapat dianalisis AI.",
    };
  }

  const apiKeys = [process.env.GROQ_API_KEY, process.env.BACKUP_API_KEY].filter(
    Boolean,
  );

  if (apiKeys.length === 0) {
    return fallbackAiDetect(content);
  }

  const cleanContent = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

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
              content: `Kamu adalah spesialis detektor keaslian artikel Bahasa Indonesia dan pakar gaya penulisan AI/ChatGPT.

Tugas: Evaluasi teks artikel berikut secara objektif dan berikan estimasi persentase kemiripan gaya penulisan AI (0% hingga 100%).

Patokan Penilaian:
- 0% - 20%: Murni Tulisan Manusia (Struktur kalimat bervariasi, gaya bahasa organis, pilihan kata alami dan emosional/situasional).
- 21% - 50%: Campuran / Terindikasi Sebagian (Ada frasa transisi kaku khas AI seperti "selain itu", "perlu diingat", "secara keseluruhan", namun masih ada gaya manusia).
- 51% - 100%: Dominan AI / ChatGPT (Struktur paragraf sangat seragam/monoton, klausa terlalu formal/generik, tanpa alur organis manusia).

Teks Artikel:
${cleanContent}

Berikan respons HANYA berupa JSON valid dengan format persis berikut tanpa markdown codeblock (tanpa \`\`\`json):
{"ai_percentage": <angka 0-100>, "analysis": "<penjelasan singkat 1-2 kalimat mengapa artikel mendapat persentase tersebut>"}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 250,
        });

        const textResponse = response.choices[0].message.content.trim();
        const cleanedJson = textResponse
          .replace(/^```json\s*/, "")
          .replace(/```$/, "")
          .trim();
        const parsed = JSON.parse(cleanedJson);

        const aiPercentage = Math.min(
          100,
          Math.max(0, Math.round(parsed.ai_percentage || 0)),
        );
        let status = "LOW";
        let label = "Wajar / Tulisan Manusia";
        if (aiPercentage > 55) {
          status = "HIGH";
          label = "Dominan AI";
        } else if (aiPercentage > 25) {
          status = "MEDIUM";
          label = "Terindikasi AI";
        }

        return {
          ai_percentage: aiPercentage,
          label,
          status,
          analysis: parsed.analysis || "Analisis selesai.",
        };
      } catch (error) {
        if (
          error.status === 404 ||
          error.status === 400 ||
          error.message?.includes("model_not_found") ||
          error.message?.includes("decommissioned")
        ) {
          // Model decommissioned or not found, continue silently to next candidate model
          continue;
        }
        console.error(
          `Groq AI Detector error on model ${model}:`,
          error.message,
        );
      }
    }
  }

  return fallbackAiDetect(cleanContent);
};

function fallbackAiDetect(text) {
  const aiKeywords = [
    "selain itu",
    "di sisi lain",
    "kesimpulannya",
    "pada dasarnya",
    "secara keseluruhan",
    "perlu diingat bahwa",
    "dalam konteks ini",
    "merupakan salah satu",
    "penting untuk dicatat",
  ];
  let matches = 0;
  const lower = text.toLowerCase();
  aiKeywords.forEach((kw) => {
    if (lower.includes(kw)) matches++;
  });

  const estimatedScore = Math.min(85, matches * 15);
  return {
    ai_percentage: estimatedScore,
    label:
      estimatedScore > 50
        ? "Terindikasi AI (Fallback)"
        : "Wajar / Tulisan Manusia (Fallback)",
    status: estimatedScore > 50 ? "MEDIUM" : "LOW",
    analysis: "Pengecekan sederhana berbasis indikator struktur kata transisi.",
  };
}
