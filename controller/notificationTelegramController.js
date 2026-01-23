const { sendTelegramMessage } = require("../services/telegram.service");

/**
 * Controller Telegram Notification
 * Dipakai untuk:
 * - submit (penulis)
 * - editor (editor review / publish)
 */
async function telegramNotificationController(req, res) {
  try {
    const { type } = req.params;

    if (type === "submit") {
      await handleSubmit(req.body);
    } else if (type === "editor") {
      await handleEditor(req.body);
    } else {
      return res.status(400).json({
        success: false,
        message: "Tipe notifikasi tidak dikenali",
      });
    }

    res.json({
      success: true,
      message: "Notifikasi Telegram berhasil dikirim",
    });
  } catch (error) {
    console.error("Telegram notification error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengirim notifikasi Telegram",
    });
  }
}

/* ================== HANDLERS ================== */

async function handleSubmit({ title, author }) {
  if (!title || !author) {
    throw new Error("title dan author wajib diisi");
  }

  await sendTelegramMessage({
    topic: "PENULIS",
    text:
      `📝 *Konten Baru Dikirim*\n\n` +
      `📰 *Judul:* ${title}\n` +
      `✍️ *Penulis:* ${author}\n` +
      `⏰ *Waktu:* ${formatDateTime()}\n\n` +
      `Status: Menunggu review editor`,
  });
}

async function handleEditor({ title, author, editor, link, action }) {
  if (!title || !editor || !link) {
    throw new Error("title, editor, dan link wajib diisi");
  }

  await sendTelegramMessage({
    topic: "EDITOR",
    text:
      `🛠️ *Konten ${action || "Direview"}*\n\n` +
      `📰 *Judul:* ${title}\n` +
      (author ? `✍️ *Penulis:* ${author}\n` : "") +
      `👤 *Editor:* ${editor}\n` +
      `⏰ *Waktu:* ${formatDateTime()}\n\n` +
      `🔗 *Link:*\n${link}`,
  });
}

/* ================== UTIL ================== */

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

module.exports = { telegramNotificationController };
