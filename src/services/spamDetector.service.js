/**
 * Daftar kata kunci konten judi/spam slot online yang umum beredar di Indonesia
 */
const GAMBLING_KEYWORDS = [
  // Judi umum & Slang Indonesia
  "judi",
  "judi online",
  "judi slot",
  "slot judi",
  "main judi",
  "bermain judi",
  "permainan judi",
  "daftar judi",
  "bandar judi",
  "agen judi",
  "judol",
  "togel",
  "toto",
  "taruhan",
  "taruhan online",
  "taruhan bola",
  "bandar",
  "agen slot",
  "situs judi online",
  "situs judi",
  "dunia judi",
  "judi bola",
  "jud1",

  // Slot & Gacor terms
  "slot",
  "slot online",
  "slot gacor",
  "slot maxwin",
  "slot88",
  "situs slot",
  "daftar slot",
  "link slot",
  "rtp slot",
  "slot terpercaya",
  "slot terbaik",
  "slot hari ini",
  "slot demo",
  "bocoran slot",
  "pola slot",
  "game slot",
  "permainan slot",
  "main slot",
  "bermain slot",
  "mesin slot",
  "kakek zeus",
  "anti rungkad",
  "rungkad",
  "rungkat",
  "pasti jp",
  "gampang jp",
  "maxwin",
  "sensasional jp",
  "pecah kepala",
  "scatter hitam",
  "scatter merah",
  "scaters",
  "free spin",
  "freespin",
  "akun pro",
  "akun vip",
  "modal receh",
  "depo",
  "wd",
  "deposit",
  "withdraw",
  "garansi kekalahan",
  "situs gacor",
  "link gacor",
  "gacor",
  "gacor abis",
  "slotgacor",
  "slotonline",

  // Game & Kasino (Indonesia)
  "poker",
  "casino",
  "kasino",
  "baccarat",
  "roulette",
  "domino",
  "dominoqq",
  "ceme",
  "capsa",
  "sakong",
  "pkv",
  "pkv games",
  "qqpoker",
  "sbobet",
  "maxbet",
  "ibcbet",
  "1xbet",
  "bola tangkas",
  "sportbook",
  "live casino",

  // Provider & Game terkenal
  "pragmatic",
  "pragmatic play",
  "pragmatik",
  "pg soft",
  "pgsoft",
  "habanero",
  "joker123",
  "joker388",
  "spadegaming",
  "microgaming",
  "playtech",
  "evoplay",
  "gates of olympus",
  "sweet bonanza",
  "starlight princess",
  "mahjong ways",
  "mahjong",
  "wild west gold",
  "zeus",
  "aztec gems",
  "lucky neko",
  "sugar rush",
  "koi gate",
  "hot hot fruit",

  // Promosi & Uang
  "bonus deposit",
  "bonus new member",
  "cashback",
  "gacor hari ini",
  "minimal deposit",
  "depo 10rb",
  "depo 25rb",
  "deposit pulsa",
  "tanpa potongan",
  "menang berapapun dibayar",
  "proses cepat",
  "aman terpercaya",

  // Call to Action (Ajakan)
  "klik link",
  "klik profil",
  "daftar di",
  "gabung di",
  "pasti dibayar",
  "daftar gratis",

  // Istilah judi Bahasa Inggris (substring aman / frasa panjang)
  "online casino",
  "casino online",
  "casino games",
  "casino game",
  "gambling",
  "gambling site",
  "gambling sites",
  "gambling online",
  "online gambling",
  "slot machine",
  "slot machines",
  "slot games",
  "slot game",
  "online slots",
  "betting",
  "betting site",
  "betting sites",
  "betting online",
  "online betting",
  "sports betting",
  "sportsbook",
  "bookmaker",
  "jackpot",
  "jackpot slots",
  "online casino games",
];

/**
 * Kata pendek Bahasa Inggris yang hanya cocok bila berdiri sendiri
 * (word boundary) untuk menghindari false positive, contoh:
 * "bet" di "betul"/"alphabet", "stake" di "stakeholder".
 */
const GAMBLING_WORDS = [
  "gamble",
  "gambles",
  "gambled",
  "gambling",
  "gambler",
  "gamblers",
  "wager",
  "wagers",
  "wagering",
  "bet",
  "bets",
  "betting",
  "bettor",
  "bettors",
  "bookmaker",
  "bookmakers",
  "bookie",
  "bookies",
  "jackpot",
  "jackpots",
  "odds",
  "stake",
  "stakes",
  "staking",
];

const GAMBLING_WORD_REGEX = new RegExp(
  `\\b(${GAMBLING_WORDS.join("|")})\\b`,
  "gi"
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
  /\b[a-z]+(88|99|777|365|4d|303|138|168|189|368|388|508|789|118|888|999)\b/i,
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
 */
function normalizeText(text) {
  if (!text) return "";

  let normalized = text.toLowerCase();

  // Bersihkan pemisah yang biasa disisipkan di antara huruf
  normalized = normalized.replace(/[\.\-_\*\/\\|]/g, "");

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
 * @param {string} text
 * @returns {{ isSpam: boolean, matchedKeywords: string[] }}
 */
function detectGambling(text) {
  if (!text) return { isSpam: false, matchedKeywords: [] };

  const originalText = text;
  const normalizedText = normalizeText(text);

  // 1. Cek keyword statis pada teks original & teks ternormalisasi
  const matchedKeywords = GAMBLING_KEYWORDS.filter(
    (kw) =>
      originalText.toLowerCase().includes(kw) || normalizedText.includes(kw)
  );

  // 1b. Cek kata pendek Bahasa Inggris (word boundary) pada teks ternormalisasi
  const normalizedMatches = normalizedText.match(GAMBLING_WORD_REGEX) || [];
  const matchedWords = [...new Set(normalizedMatches.map((w) => w.toLowerCase()))];

  // 2. Cek regex pattern pada teks original & teks ternormalisasi
  const matchedPatterns = [];
  GAMBLING_PATTERNS.forEach((re) => {
    if (re.test(originalText) || re.test(normalizedText)) {
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