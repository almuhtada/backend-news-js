const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TOPIC_PENULIS = process.env.TELEGRAM_TOPIC_PENULIS;
const TOPIC_EDITOR = process.env.TELEGRAM_TOPIC_EDITOR;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Escape special characters for Telegram MarkdownV2
function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

async function sendTelegramMessage({ topic, text, useHtml = false }) {
  const topicId = topic === "PENULIS" ? TOPIC_PENULIS : TOPIC_EDITOR;
  const isForumChat = String(CHAT_ID || "").startsWith("-100");

  console.log("[Telegram] Config:", {
    hasBotToken: !!BOT_TOKEN,
    chatId: CHAT_ID,
    topic,
    topicId,
    isForumChat,
  });

  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error(
      `Telegram ENV belum lengkap: BOT_TOKEN=${!!BOT_TOKEN}, CHAT_ID=${CHAT_ID}`
    );
  }

  if (!isForumChat) {
    console.warn(
      "[Telegram] PERINGATAN: CHAT_ID tidak diawali -100. " +
      "Supergroup seharusnya formatnya -100XXXXXXXXXX. " +
      `Nilai saat ini: ${CHAT_ID}`
    );
  }

  const payload = {
    chat_id: CHAT_ID,
    text,
  };

  // Hanya kirim thread id jika target adalah forum topic di supergroup.
  if (isForumChat && topicId) {
    payload.message_thread_id = Number(topicId);
  }

  // Only add parse_mode if explicitly using HTML
  if (useHtml) {
    payload.parse_mode = "HTML";
  }

  console.log("[Telegram] Mengirim payload:", JSON.stringify(payload));

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("[Telegram] API error:", JSON.stringify(data));
    throw new Error(data.description || "Telegram API error");
  }

  console.log("[Telegram] Pesan berhasil dikirim, message_id:", data.result?.message_id);
  return data;
}

module.exports = { sendTelegramMessage, escapeMarkdown };
