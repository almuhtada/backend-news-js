require("dotenv").config();
const mysql = require("mysql2/promise");

const WP_DB = process.env.WP_DB_NAME || "almx6124_wp397";
const APP_DB = process.env.DB_NAME;
const ACHIEVEMENTS_PAGE_ID = 1180;
const PUBLICATIONS_PAGE_ID = 1630;
const MAX_VARCHAR = 255;

function fitText(value, maxLength = MAX_VARCHAR) {
  if (!value) return value;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, "-")
    .replace(/&#8230;/gi, "...")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBlocks(html, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  return Array.from(html.matchAll(regex)).map((match) => match[1]).filter(Boolean);
}

function parseAchievementItem(html) {
  const text = decodeHtml(html);
  if (!text) return null;

  const nameMatch = text.match(/\(([^()]+)\)\s*$/);
  const yearMatch = text.match(/(?:Tahun|tahun)\s*(\d{4})|(\d{4})/);

  const name = nameMatch ? nameMatch[1].trim() : "Tidak diketahui";
  const years = yearMatch ? Number(yearMatch[1] || yearMatch[2]) : 0;
  const title = text.replace(/\(([^()]+)\)\s*$/, "").trim();

  if (!title || !name || !years) return null;

  return {
    title: fitText(title),
    name: fitText(name),
    years,
  };
}

function parsePublicationItem(html) {
  const linkMatch = html.match(/href="([^"]+)"/i);
  const link = linkMatch ? linkMatch[1].trim() : null;
  const text = decodeHtml(html);
  if (!text) return null;

  const mainMatch = text.match(/^(.+?)\s*\((\d{4})\)\.?\s*(.+)$/);
  if (!mainMatch) return null;

  const authors = mainMatch[1].trim();
  const year = Number(mainMatch[2]);
  const remainder = mainMatch[3].trim();

  const firstPeriod = remainder.indexOf(". ");
  const title =
    firstPeriod >= 0 ? remainder.slice(0, firstPeriod + 1).trim() : remainder;
  const journal =
    firstPeriod >= 0 ? remainder.slice(firstPeriod + 2).trim() : null;

  if (!authors || !year || !title) return null;

  return {
    title: fitText(title),
    authors: fitText(authors),
    year,
    journal: journal ? fitText(journal) : null,
    link: link ? fitText(link) : null,
  };
}

async function fetchPageContent(conn, pageId) {
  const [rows] = await conn.query(
    `SELECT ID, post_title, post_content
     FROM \`${WP_DB}\`.wp8o_posts
     WHERE ID = ? LIMIT 1`,
    [pageId],
  );
  return rows[0] || null;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    console.log(`Source WP DB: ${WP_DB}`);
    console.log(`Target App DB: ${APP_DB}\n`);

    const achievementsPage = await fetchPageContent(conn, ACHIEVEMENTS_PAGE_ID);
    const publicationsPage = await fetchPageContent(conn, PUBLICATIONS_PAGE_ID);

    if (!achievementsPage || !publicationsPage) {
      throw new Error("Halaman sumber WordPress tidak ditemukan.");
    }

    const achievementItems = extractBlocks(achievementsPage.post_content, "li")
      .map(parseAchievementItem)
      .filter(Boolean);

    const publicationBlocks = [
      ...extractBlocks(publicationsPage.post_content, "p"),
      ...extractBlocks(publicationsPage.post_content, "li"),
    ];
    const publicationItems = publicationBlocks
      .map(parsePublicationItem)
      .filter(Boolean);

    console.log(`Achievements parsed: ${achievementItems.length}`);
    console.log(`Publications parsed: ${publicationItems.length}\n`);

    await conn.query(`DELETE FROM \`${APP_DB}\`.achievements`);
    await conn.query(`DELETE FROM \`${APP_DB}\`.publications`);

    const achievementSql = `
      INSERT INTO \`${APP_DB}\`.achievements (title, name, years, createdAt, updatedAt)
      VALUES (?, ?, ?, NOW(), NOW())
    `;

    for (const item of achievementItems) {
      await conn.query(achievementSql, [item.title, item.name, item.years]);
    }

    const publicationSql = `
      INSERT INTO \`${APP_DB}\`.publications (title, authors, year, journal, link, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;

    for (const item of publicationItems) {
      await conn.query(publicationSql, [
        item.title,
        item.authors,
        item.year,
        item.journal,
        item.link,
      ]);
    }

    const [[achievementCount]] = await conn.query(
      `SELECT COUNT(*) AS total FROM \`${APP_DB}\`.achievements`,
    );
    const [[publicationCount]] = await conn.query(
      `SELECT COUNT(*) AS total FROM \`${APP_DB}\`.publications`,
    );

    console.log("Migration complete:");
    console.log(`- achievements: ${achievementCount.total}`);
    console.log(`- publications: ${publicationCount.total}`);
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error("Import failed:", error.message);
  process.exit(1);
});
