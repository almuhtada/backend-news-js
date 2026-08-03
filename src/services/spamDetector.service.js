const {
  GAMBLING_KEYWORDS,
  GAMBLING_WORDS,
} = require("../utils/gamblingKeyword");

const GAMBLING_WORD_REGEX = new RegExp(
  `\\b(${GAMBLING_WORDS.join("|")})\\b`,
  "gi",
);

/**
 * Regex pattern untuk mendeteksi nama platform/domain judi yang disamarkan:
 */
const GAMBLING_PATTERNS = [
  // Platform dengan angka di belakang: betwin99, slotwin88, dll
  /\b[a-z]*(slot|bet|win|judi|togel|casino|poker|4d|toto|qq|play88|gacor|mpo|tangkas|dewaslot)[a-z0-9]*\d{2,}\b/i,
  // Nama platform diikuti angka: plataformawin656, royalwin123
  /\b[a-z]{3,}(win|bet|slot|play|cash|spin|rich|jp|max)\d{2,}\b/i,
  // Domain dengan angka: nama123.com, nama88.net
  /\b[a-z]+(88|99|777|365|4d|303|138|168|189|368|388|508|789|118|888|999|212|5000|7777|8888)\b/i,
  // Kata judi diikuti angka slot populer (slot 777, gacor 888, dll)
  /\b(slot|slots|gacor|jackpot|togel|casino|qq|pkv|poker|situs)[\s-]?[- -]?\s?(777|888|999|666|555|7777|8888|9999|5000|500)\b/i,
  // Slot m angka populer berdiri sendiri
  /\bslot\s*(777|888|999|1000|5000|500|77|88|99)\b/i,
  // Pola tautan IP Address langsung (sering digunakan situs judi untuk menghindari blokir DNS)
  /\bhttps?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/i,
  // Tautan shortener yang sering digunakan untuk spam slot
  /\b(heylink\.me|linktr\.ee|s\.id|bit\.ly|tinyurl\.com|rebrand\.ly|page\.link|cutt\.ly|url\.id)\/\w+/i,
  // Deteksi Leetspeak lanjutan (contoh: sl0t, jud1, t0g3l, g4c0r)
  /\b(sl[0o]t|j[u0]d[i1]|t[0o]g[e3]l|g[a4]c[0o]r|sp1n|m[a4]xw1n)\b/i,
  // Kalimat template spam bahasa Inggris umum
  /played.{0,20}rounds\s+on\s+\w+\d+/i,
  /join\s+(us|now).{0,20}at\s+\w+\d+/i,
  /sign\s+up\s+(at|on|in)\s+\w+\d+/i,
  /register\s+(at|on)\s+\w+\d+/i,
  /payouts?\s+are\s+(fast|quick|instant)/i,
];

/**
 * Normalisasi teks untuk memotong trik bypass spammer:
 * 1. Mengubah ke lowercase.
 * 2. Menghapus karakter pemisah khusus seperti titik, strip, garis bawah, bintang (contoh: s.l.o.t -> slot).
 * 3. Mengubah karakter leetspeak / homoglyph (0 -> o, 3 -> e, 4 -> a, 1 -> i, 5 -> s, @ -> a, $ -> s).
 * @param {string} text
 * @param {boolean} removeSpaces - Jika true, hapus juga semua spasi (untuk tangkap "s l o t" -> "slot")
 */
function normalizeText(text, removeSpaces = false) {
  if (!text) return "";

  let normalized = text.toLowerCase();

  // Bersihkan pemisah yang biasa disisipkan di antara huruf
  normalized = normalized.replace(/[.\-_*/\\|]/g, "");

  // Opsional: hapus semua spasi (untuk menangkap trik spammer seperti "s l o t", "j u d i")
  if (removeSpaces) {
    normalized = normalized.replace(/\s+/g, "");
  }

  // Kamus konversi leetspeak
  const leetMap = {
    0: "o",
    1: "i",
    3: "e",
    4: "a",
    5: "s",
    "@": "a",
    $: "s",
  };

  let decompressed = "";
  for (const char of normalized) {
    decompressed += leetMap[char] || char;
  }

  return decompressed;
}

/**
 * Cek apakah teks mengandung kata kunci atau pola judi online
 * Scan pada 3 versi teks:
 *   - originalText (lowercase)
 *   - normalizedText (leetspeak + pemisah dihapus, spasi tetap)
 *   - collapsedText (semua spasi juga dihapus, untuk tangkap "s l o t" dll)
 * @param {string} text
 * @returns {{ isSpam: boolean, matchedKeywords: string[] }}
 */
function detectGambling(text) {
  if (!text) return { isSpam: false, matchedKeywords: [] };

  const originalLower = text.toLowerCase();
  const normalizedText = normalizeText(text, false);
  const collapsedText = normalizeText(text, true);

  // 1. Cek keyword statis pada 3 versi teks
  const matchedKeywords = GAMBLING_KEYWORDS.filter((kw) => {
    const kwNoSpaces = kw.replace(/\s+/g, "");
    return (
      originalLower.includes(kw) ||
      normalizedText.includes(kw) ||
      collapsedText.includes(kwNoSpaces)
    );
  });

  // 1b. Cek kata pendek Bahasa Inggris (word boundary) pada teks ternormalisasi
  const normalizedMatches = normalizedText.match(GAMBLING_WORD_REGEX) || [];
  const collapsedMatches = collapsedText.match(GAMBLING_WORD_REGEX) || [];
  const matchedWords = [
    ...new Set(
      [...normalizedMatches, ...collapsedMatches].map((w) => w.toLowerCase()),
    ),
  ];

  // 2. Cek regex pattern pada teks original & teks ternormalisasi
  const matchedPatterns = [];
  GAMBLING_PATTERNS.forEach((re) => {
    if (re.test(text) || re.test(normalizedText) || re.test(collapsedText)) {
      matchedPatterns.push(re.source.substring(0, 30) + "…");
    }
  });

  const allMatched = [
    ...new Set([...matchedKeywords, ...matchedWords, ...matchedPatterns]),
  ];

  return {
    isSpam: allMatched.length > 0,
    matchedKeywords: allMatched,
  };
}

module.exports = { detectGambling, GAMBLING_KEYWORDS };
