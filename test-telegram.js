const BOT_TOKEN = "8310564211:AAHq8x9kkZ_A907UrgMggJ8GY_liPyH3yUk";
const CHAT_ID = "-1003881909105";
const TOPIC_ID = "3";

async function testTelegram() {
  const title = "Festival Kuliner Nusantara Kembali Hadir, Manjakan Lidah Warga Kota";
  const text = `📝 Berita Baru Dikirim

📰 Judul: ${title}
✍️ Penulis: admin_almuhtada
⏰ Waktu: ${new Date().toLocaleString("id-ID")}

Status: Menunggu review editor`;

  const payload = {
    chat_id: CHAT_ID,
    message_thread_id: Number(TOPIC_ID),
    text,
  };

  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("\n--- Sending to Telegram ---\n");

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

testTelegram().catch(console.error);
