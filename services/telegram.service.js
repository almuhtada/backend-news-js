const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}`;

async function sendTelegramMessage({ topic, text }) {
  const topicId =
    topic === "PENULIS"
      ? process.env.TG_TOPIC_PENULIS
      : process.env.TG_TOPIC_EDITOR;

  if (!process.env.TG_BOT_TOKEN || !process.env.TG_CHAT_ID || !topicId) {
    throw new Error("Telegram ENV belum lengkap");
  }

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TG_CHAT_ID,
      message_thread_id: Number(topicId),
      text,
      parse_mode: "Markdown",
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("Telegram error:", data);
  }

  return data;
}

module.exports = { sendTelegramMessage };
