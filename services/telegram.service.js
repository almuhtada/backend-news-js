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

  if (!BOT_TOKEN || !CHAT_ID || !topicId) {
    console.error("Telegram ENV:", {
      BOT_TOKEN: !!BOT_TOKEN,
      CHAT_ID,
      topicId,
    });
    throw new Error("Telegram ENV belum lengkap");
  }

  const payload = {
    chat_id: CHAT_ID,
    message_thread_id: Number(topicId),
    text,
  };

  // Only add parse_mode if explicitly using HTML
  if (useHtml) {
    payload.parse_mode = "HTML";
  }

  console.log("Telegram payload:", JSON.stringify(payload, null, 2));

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("Telegram API error:", data);
    throw new Error(data.description || "Telegram API error");
  }

  return data;
}

module.exports = { sendTelegramMessage, escapeMarkdown };
