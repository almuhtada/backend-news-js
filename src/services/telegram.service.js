const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TOPIC_PENULIS = process.env.TELEGRAM_TOPIC_PENULIS;
const TOPIC_EDITOR = process.env.TELEGRAM_TOPIC_EDITOR;
const TOPIC_SPAM = process.env.TELEGRAM_TOPIC_SPAM;
const TOPIC_LOGIN_HISTORY = process.env.TELEGRAM_TOPIC_LOGIN_HISTORY;
const TOPIC_ARTIKEL_MASUK =
  process.env.TELEGRAM_TOPIC_ARTIKEL_MASUK || TOPIC_PENULIS;
const TOPIC_REVISI_ARTIKEL =
  process.env.TELEGRAM_TOPIC_REVISI_ARTIKEL || TOPIC_EDITOR;
const TOPIC_APPROVAL = process.env.TELEGRAM_TOPIC_APPROVAL || TOPIC_EDITOR;
const TOPIC_SYSTEM_ERROR =
  process.env.TELEGRAM_TOPIC_SYSTEM_ERROR || TOPIC_SPAM;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Escape special characters for Telegram MarkdownV2
function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

// Escape HTML untuk mode parse_mode=HTML
// Mencegah pesan rusak jika konten user mengandung <, >, &, dll.
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendTelegramMessage({ topic, text, useHtml = false }) {
  let topicId;
  if (topic === "PENULIS" || topic === "ARTIKEL_MASUK") {
    topicId = TOPIC_ARTIKEL_MASUK;
  } else if (topic === "REVISI_ARTIKEL") {
    topicId = TOPIC_REVISI_ARTIKEL;
  } else if (topic === "APPROVAL") {
    topicId = TOPIC_APPROVAL;
  } else if (topic === "SPAM") {
    topicId = TOPIC_SPAM;
  } else if (topic === "SYSTEM_ERROR") {
    topicId = TOPIC_SYSTEM_ERROR;
  } else if (topic === "LOGIN_HISTORY") {
    topicId = TOPIC_LOGIN_HISTORY;
  } else {
    topicId = TOPIC_EDITOR;
  }
  const isForumChat = String(CHAT_ID || "").startsWith("-100");

  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error(
      `Telegram ENV belum lengkap: BOT_TOKEN=${!!BOT_TOKEN}, CHAT_ID=${CHAT_ID}`,
    );
  }

  if (!isForumChat) {
    console.warn(
      "[Telegram] PERINGATAN: CHAT_ID tidak diawali -100. " +
        "Supergroup seharusnya formatnya -100XXXXXXXXXX. " +
        `Nilai saat ini: ${CHAT_ID}`,
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

  return data;
}

module.exports = { sendTelegramMessage, escapeMarkdown, escapeHtml };
