const { sendTelegramMessage } = require("../services/telegram.service");
const { ok, badRequest, serverError } = require("../shared/http/response");

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
      return badRequest(res, "Tipe notifikasi tidak dikenali");
    }

    return ok(res, null, "Notifikasi Telegram berhasil dikirim");
  } catch (error) {
    console.error("Telegram notification error:", error);
    return serverError(res, error, "Gagal mengirim notifikasi Telegram");
  }
}

/* ================== HANDLERS ================== */

async function handleSubmit({ title, author }) {
  if (!title || !author) {
    throw new Error("title dan author wajib diisi");
  }

  await sendTelegramMessage({
    topic: "PENULIS",
    useHtml: true,
    text:
      `📝 <b>Artikel Baru Dikirim</b>\n\n` +
      `📌 <b>Judul:</b> ${title}\n` +
      `✍️ <b>Penulis:</b> ${author}\n` +
      `⏰ <b>Waktu:</b> ${formatDateTime()}\n\n` +
      `🟡 <b>Status:</b> <i>Menunggu Review Editor</i>`,
  });
}

async function handleEditor({ title, author, editor, link, action }) {
  if (!title || !editor || !link) {
    throw new Error("title, editor, dan link wajib diisi");
  }

  await sendTelegramMessage({
    topic: "EDITOR",
    useHtml: true,
    text:
      `🛠️ <b>Artikel ${action || "Direview"}</b>\n\n` +
      `📌 <b>Judul:</b> ${title}\n` +
      (author ? `✍️ <b>Penulis:</b> ${author}\n` : "") +
      `👤 <b>Editor:</b> ${editor}\n` +
      `⏰ <b>Waktu:</b> ${formatDateTime()}\n\n` +
      `🔍 <a href="${link}"><b>Buka Link Artikel</b></a>`,
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
