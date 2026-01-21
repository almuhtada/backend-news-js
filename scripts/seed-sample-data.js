/**
 * Script untuk membuat sample data untuk testing
 * Berguna jika belum ada data WordPress atau untuk development
 *
 * Cara menggunakan:
 * node scripts/seed-sample-data.js
 */

require("dotenv").config();
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");
const { User, Post, Category, Tag } = require("../schema");

async function seedData() {
  console.log("🌱 Starting seed process...\n");

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Sync models (create tables if not exist)
    await sequelize.sync({ force: false }); // force: true akan drop semua tabel
    console.log("✅ Database models synced\n");

    // 1. Create sample users
    console.log("👥 Creating sample users...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    const [adminUser] = await User.findOrCreate({
      where: { email: "admin@example.com" },
      defaults: {
        username: "admin",
        email: "admin@example.com",
        password: hashedPassword,
        role: "admin",
      },
    });

    const [writerUser] = await User.findOrCreate({
      where: { email: "writer@example.com" },
      defaults: {
        username: "writer",
        email: "writer@example.com",
        password: hashedPassword,
        role: "user",
      },
    });

    console.log(`✓ Created user: ${adminUser.username}`);
    console.log(`✓ Created user: ${writerUser.username}\n`);

    // 2. Create sample categories
    console.log("🏷️  Creating sample categories...");
    const categories = [
      {
        name: "Berita",
        slug: "berita",
        description: "Berita terkini dan terpercaya",
      },
      {
        name: "Teknologi",
        slug: "teknologi",
        description: "Berita seputar teknologi dan inovasi",
      },
      {
        name: "Olahraga",
        slug: "olahraga",
        description: "Berita olahraga dan kompetisi",
      },
      {
        name: "Politik",
        slug: "politik",
        description: "Berita politik dan pemerintahan",
      },
      {
        name: "Ekonomi",
        slug: "ekonomi",
        description: "Berita ekonomi dan bisnis",
      },
    ];

    const createdCategories = [];
    for (const catData of categories) {
      const [category] = await Category.findOrCreate({
        where: { slug: catData.slug },
        defaults: catData,
      });
      createdCategories.push(category);
      console.log(`✓ Created category: ${category.name}`);
    }
    console.log("");

    // 3. Create sample tags
    console.log("🏷️  Creating sample tags...");
    const tags = [
      { name: "Breaking News", slug: "breaking-news" },
      { name: "Trending", slug: "trending" },
      { name: "Viral", slug: "viral" },
      { name: "Investigasi", slug: "investigasi" },
      { name: "Opini", slug: "opini" },
    ];

    const createdTags = [];
    for (const tagData of tags) {
      const [tag] = await Tag.findOrCreate({
        where: { slug: tagData.slug },
        defaults: tagData,
      });
      createdTags.push(tag);
      console.log(`✓ Created tag: ${tag.name}`);
    }
    console.log("");

    // 4. Create sample posts
    console.log("📝 Creating sample posts...");
    const posts = [
      {
        title: "Perkembangan Teknologi AI di Indonesia Tahun 2026",
        slug: "perkembangan-teknologi-ai-indonesia-2026",
        content: `<p>Indonesia mengalami perkembangan signifikan dalam adopsi teknologi Artificial Intelligence (AI) di berbagai sektor. Pada tahun 2026, implementasi AI tidak hanya terbatas pada perusahaan teknologi besar, tetapi juga merambah ke UMKM dan sektor publik.</p>

<h2>Implementasi AI di Berbagai Sektor</h2>
<p>Beberapa sektor yang mengalami transformasi dengan AI antara lain:</p>
<ul>
  <li>Pendidikan: Sistem pembelajaran adaptif menggunakan AI</li>
  <li>Kesehatan: Diagnosis penyakit dengan machine learning</li>
  <li>Pertanian: Smart farming dengan IoT dan AI</li>
  <li>Transportasi: Optimasi rute dengan algoritma AI</li>
</ul>

<h2>Tantangan dan Peluang</h2>
<p>Meskipun perkembangannya pesat, masih ada tantangan seperti kebutuhan SDM yang kompeten dan infrastruktur digital yang merata. Namun, peluang untuk berkembang masih sangat besar dengan dukungan pemerintah dan ekosistem startup yang semakin matang.</p>`,
        excerpt:
          "Indonesia mengalami perkembangan signifikan dalam adopsi teknologi AI di berbagai sektor pada tahun 2026.",
        author_id: adminUser.id,
        status: "publish",
        published_at: new Date("2026-01-15"),
        views: 1250,
      },
      {
        title: "Tim Nasional Indonesia Lolos ke Piala Dunia 2026",
        slug: "timnas-indonesia-lolos-piala-dunia-2026",
        content: `<p>Sejarah baru terukir untuk sepak bola Indonesia. Tim Nasional Indonesia berhasil lolos ke putaran final Piala Dunia 2026 yang akan diselenggarakan di Amerika Serikat, Meksiko, dan Kanada.</p>

<h2>Perjalanan Menuju Piala Dunia</h2>
<p>Perjalanan Timnas Indonesia tidaklah mudah. Dengan kemenangan dramatis 2-1 atas Australia di laga terakhir kualifikasi, Indonesia memastikan tiket ke Piala Dunia untuk pertama kalinya dalam sejarah.</p>

<h2>Reaksi Publik</h2>
<p>Keberhasilan ini disambut dengan euforia luar biasa oleh masyarakat Indonesia. Perayaan spontan terjadi di berbagai kota besar, menunjukkan betapa pentingnya pencapaian ini bagi bangsa Indonesia.</p>`,
        excerpt:
          "Tim Nasional Indonesia membuat sejarah dengan lolos ke putaran final Piala Dunia 2026.",
        author_id: writerUser.id,
        status: "publish",
        published_at: new Date("2026-01-16"),
        views: 3400,
      },
      {
        title: "Ekonomi Digital Indonesia Capai $100 Miliar",
        slug: "ekonomi-digital-indonesia-100-miliar",
        content: `<p>Ekonomi digital Indonesia mencapai milestone penting dengan nilai transaksi mencapai $100 miliar pada tahun 2026. Pertumbuhan ini didorong oleh e-commerce, fintech, dan layanan digital lainnya.</p>

<h2>Faktor Pendorong Pertumbuhan</h2>
<p>Beberapa faktor yang mendorong pertumbuhan ekonomi digital:</p>
<ol>
  <li>Penetrasi internet yang mencapai 80% populasi</li>
  <li>Adopsi pembayaran digital yang masif</li>
  <li>Ekosistem startup yang berkembang pesat</li>
  <li>Dukungan regulasi yang kondusif</li>
</ol>

<h2>Proyeksi ke Depan</h2>
<p>Para ahli memproyeksikan ekonomi digital Indonesia akan terus tumbuh hingga mencapai $150 miliar pada tahun 2027, menjadikan Indonesia sebagai salah satu ekonomi digital terbesar di Asia Tenggara.</p>`,
        excerpt:
          "Ekonomi digital Indonesia mencapai nilai transaksi $100 miliar di tahun 2026.",
        author_id: adminUser.id,
        status: "publish",
        published_at: new Date("2026-01-17"),
        views: 890,
      },
      {
        title: "Kebijakan Baru Pemerintah untuk Energi Terbarukan",
        slug: "kebijakan-energi-terbarukan-2026",
        content: `<p>Pemerintah Indonesia meluncurkan kebijakan baru untuk mempercepat transisi ke energi terbarukan. Target 35% energi dari sumber terbarukan pada 2030 diperkuat dengan berbagai insentif dan regulasi.</p>

<h2>Poin Utama Kebijakan</h2>
<ul>
  <li>Insentif pajak untuk investasi energi terbarukan</li>
  <li>Subsidi untuk panel surya rumah tangga</li>
  <li>Pengembangan infrastruktur pembangkit listrik tenaga angin</li>
  <li>Kerjasama dengan sektor swasta untuk proyek energi bersih</li>
</ul>`,
        excerpt: "Pemerintah luncurkan kebijakan baru untuk energi terbarukan.",
        author_id: writerUser.id,
        status: "publish",
        published_at: new Date("2026-01-18"),
        views: 540,
      },
      {
        title: "Startup Indonesia Raih Pendanaan $50 Juta",
        slug: "startup-indonesia-pendanaan-50-juta",
        content: `<p>Startup teknologi Indonesia berhasil meraih pendanaan seri B senilai $50 juta dari investor global. Pendanaan ini akan digunakan untuk ekspansi regional dan pengembangan produk.</p>

<h2>Tentang Startup</h2>
<p>Startup yang bergerak di bidang fintech ini telah melayani lebih dari 5 juta pengguna di Indonesia dan berencana ekspansi ke negara-negara ASEAN lainnya.</p>`,
        excerpt: "Startup teknologi Indonesia raih pendanaan $50 juta dari investor global.",
        author_id: adminUser.id,
        status: "draft",
        published_at: null,
        views: 0,
      },
    ];

    const createdPosts = [];
    for (let i = 0; i < posts.length; i++) {
      const postData = posts[i];
      const [post] = await Post.findOrCreate({
        where: { slug: postData.slug },
        defaults: postData,
      });
      createdPosts.push(post);

      // Add categories (random 1-3 categories per post)
      const numCategories = Math.floor(Math.random() * 2) + 1;
      const randomCategories = createdCategories
        .sort(() => 0.5 - Math.random())
        .slice(0, numCategories);
      await post.setCategories(randomCategories);

      // Add tags (random 1-3 tags per post)
      const numTags = Math.floor(Math.random() * 2) + 1;
      const randomTags = createdTags.sort(() => 0.5 - Math.random()).slice(0, numTags);
      await post.setTags(randomTags);

      console.log(`✓ Created post: ${post.title}`);
    }
    console.log("");

    console.log("🎉 Seed completed successfully!\n");
    console.log("Summary:");
    console.log(`- Users: ${2}`);
    console.log(`- Categories: ${createdCategories.length}`);
    console.log(`- Tags: ${createdTags.length}`);
    console.log(`- Posts: ${createdPosts.length}`);
    console.log("\nLogin credentials:");
    console.log("- Admin: admin@example.com / password123");
    console.log("- Writer: writer@example.com / password123");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run seed
seedData();
