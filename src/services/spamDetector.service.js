/**
 * Daftar kata kunci konten judi/spam yang umum beredar di Indonesia
 */
const GAMBLING_KEYWORDS = [
  // Judi umum
  "judi", "judol", "togel", "toto", "taruhan", "bandar", "agen judi",
  // Slot
  "slot", "slot online", "slot gacor", "slot maxwin", "slot88", "situs slot",
  "daftar slot", "link slot", "rtp slot", "slot terpercaya", "slot terbaik",
  "slot hari ini", "slot demo", "bocoran slot",
  // Game
  "poker", "casino", "kasino", "baccarat", "roulette", "domino", "dominoqq",
  "ceme", "capsa", "sakong", "pkv", "pkv games", "qqpoker",
  // Provider
  "pragmatic", "pg soft", "habanero", "joker123", "joker388", "spadegaming",
  "microgaming", "playtech", "evoplay",
  // Game titles
  "gates of olympus", "sweet bonanza", "starlight princess", "mahjong ways",
  "mahjong", "wild west gold", "zeus", "aztec gems", "lucky neko",
  "sugar rush", "koi gate", "hot hot fruit",
  // Betting
  "sbobet", "maxbet", "ibcbet", "1xbet", "bola tangkas", "sportbook",
  "live casino", "live score judi",
  // Promo spam
  "bonus deposit", "bonus new member", "cashback", "freespin", "free spin",
  "scatter hitam", "jackpot", "maxwin", "gacor hari ini", "pola slot",
  "minimal deposit", "depo 10rb", "depo 25rb", "deposit pulsa tanpa potongan",
  // URL patterns
  "bit.ly/slot", "linktr.ee/slot", "s.id/slot",
];

/**
 * Regex pattern untuk mendeteksi nama platform/domain judi yang disamarkan:
 * - mengandung angka di tengah/akhir nama (plataformawin656, betwin99, dll)
 * - pola umum: [huruf]+[angka]{2,} atau [huruf]+(win|bet|slot|play|casino|4d|qq)[huruf0-9]*
 */
const GAMBLING_PATTERNS = [
  // Platform dengan angka di belakang: betwin99, slotwin88, dll
  /\b[a-z]*(slot|bet|win|judi|togel|casino|poker|4d|toto|qq|play88|gacor)[a-z0-9]*\d{2,}\b/i,
  // Nama platform diikuti angka: plataformawin656, royalwin123
  /\b[a-z]{4,}(win|bet|slot|play|cash|spin|rich)\d{2,}\b/i,
  // Domain dengan angka: nama123.com, nama88.net
  /\b[a-z]+(88|99|777|365|4d|303|138|168|189|368|388|508|789)\b/i,
  // Pola "played a few rounds on [platform]" atau "join us at [platform]"
  /played.{0,20}rounds\s+on\s+\w+\d+/i,
  /join\s+(us|now).{0,20}at\s+\w+\d+/i,
  /sign\s+up\s+(at|on|in)\s+\w+\d+/i,
  /register\s+(at|on)\s+\w+\d+/i,
  /payouts?\s+are\s+(fast|quick|instant)/i,
  /\bpartner\s+with\s+us\b/i,
  /\bearn\s+recurring\s+commissions?\b/i,
];

/**
 * Cek apakah teks mengandung kata kunci atau pola judi
 * @param {string} text
 * @returns {{ isSpam: boolean, matchedKeywords: string[] }}
 */
function detectGambling(text) {
  if (!text) return { isSpam: false, matchedKeywords: [] };

  const lower = text.toLowerCase();

  // Cek keyword statis
  const matchedKeywords = GAMBLING_KEYWORDS.filter((kw) => lower.includes(kw));

  // Cek regex pattern
  const matchedPatterns = GAMBLING_PATTERNS
    .filter((re) => re.test(text))
    .map((re) => re.source.substring(0, 30) + "…");

  const allMatched = [...matchedKeywords, ...matchedPatterns];

  return {
    isSpam: allMatched.length > 0,
    matchedKeywords: allMatched,
  };
}

module.exports = { detectGambling, GAMBLING_KEYWORDS };
