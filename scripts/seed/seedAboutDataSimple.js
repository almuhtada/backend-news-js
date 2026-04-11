require("dotenv").config();
const sequelize = require("../../config/database");
const { About } = require("../../schema");

const aboutData = [
  {
    section_key: "main_intro",
    title: "Tentang Pesantren",
    content:
      "Pesantren Riset Al-Muhtada adalah pesantren mahasiswa di Semarang yang bertujuan untuk mencetak Muslim intelektual yang berakhlak mulia, berprestasi, dan memiliki keterampilan riset yang unggul. Pesantren ini diperuntukkan bagi para mahasiwa dan mahasiswi yang memiliki komitmen tinggi untuk maju dan berprestasi. Para calon santri diseleksi dengan kuota yang terbatas. Dengan lingkungan yang kondusif, asrama putera dan puteri terpisah, serta bebas biaya asrama, para santri dibimbing oleh para pengasuh dan guru yang berlatar belakang pendidikan S2/S3 dari dalam dan luar negeri.",
    image_url: null,
    order_number: 1,
    metadata: null,
  },
  {
    section_key: "founders",
    title: "Sejarah Pendirian",
    content:
      "Pesantren ini didirikan oleh Ustadz Dr. H. Dani Muhtada, M.Ag., M.A., M.P.A dan Ustadzah Hikmiyatin Jalilah, S.Ag., M.Ag. pada tanggal 12 Agustus 2018. Pesantren ini berada di bawah naungan Yayasan Kanzul Amal Al-Muhtad, yang berdiri dengan Akta Notaris Teguh Pambudi, S.H., M.Kn. dengan Nomor 26 tertanggal 21 Oktober 2020, serta disahkan oleh Kementerian Hukum dan HAM melalui Keputusan Menteri Hukum dan HAM Nomor AHU-0001360.AH.01.05 Tahun 2021.",
    image_url: null,
    order_number: 2,
    metadata: null,
  },
  {
    section_key: "vision",
    title: "Visi",
    content:
      "Menjadi pesantren unggulan yang mencetak mahasiswa muslim intelektual yang beriman, berbudi, dan berprestasi",
    image_url: null,
    order_number: 3,
    metadata: null,
  },
  {
    section_key: "mission",
    title: "Misi",
    content: JSON.stringify([
      "Mencetak insan akademis melalui kegiatan pengajaran, diskusi dan pelatihan",
      "Mengembangkan nalar kritis-analitis melalui kegiatan riset wajib tahunan",
      "Menanamkan jiwa pengabdian melalui kegiatan bakti sosial kemasyarakatan",
      "Menanamkan nilai-nilai keislaman, keummatan dan kebangsaan dalam kehidupan sehari-hari",
    ]),
    image_url: null,
    order_number: 4,
    metadata: { type: "list" },
  },
  {
    section_key: "founder_ustadz",
    title: "Ustadz Dr. H. Dani Muhtada, M.Ag., M.A., M.P.A.",
    content:
      "Beliau adalah dosen Fakultas Hukum Universitas Negeri Semarang (UNNES). Pendidikan dasar dan menengah (SD/MI, MTs, MA) beliau tempuh di Banyuwangi dan Jember, Jawa Timur. Beliau melanjutkan Pendidikan Sarjana (S1) dan Magister (S2) dalam bidang Hukum Islam di Fakultas Syariah IAIN Walisongo Semarang. Beliau sempat menyelesaikan Pendidikan S2 dalam bidang Interdisciplinary Islamic Studies (MA) di UIN Sunan Kalijaga Yogyakarta, yang merupakan program kerjasama dengan McGill University Canada. Gelar Master of Public Administration (MPA) beliau dapatkan dari Flinders University di Adelaide, Australia. Adapun gelar doktor diperoleh dari Northern Illinois University di Amerika Serikat. Disertasi beliau tentang Politik Hukum Islam di Indonesia, dengan fokus penelitian pada penyebaran Perda-Perda Syariah pasca Orde Baru.",
    image_url: null,
    order_number: 5,
    metadata: { role: "pengasuh" },
  },
  {
    section_key: "founder_ustadzah",
    title: "Ustadzah Hikmiyatin Jalilah, S.Ag., M.Ag.",
    content:
      "Beliau menempuh pendidikan dasar dan menengah (MI, MTs, MA) di Gresik dan Malang, Jawa Timur. Setelah itu beliau melanjutkan Pendidikan Sarjana (S1) dalam bidang Pendidikan Bahasa Arab di Fakultas Tarbiyah IAIN Walisongo Semarang. Di kampus yang sama, beliau juga menamatkan pendidikan Magister (S2) dalam bidang Pendidikan Islam. Tesis beliau berjudul “Kesetaraan Jender: Studi Komparatif atas Pengaruh Pendidikan Pesantren terhadap Persepsi Santriwati Pesantren Al-Muayyad dan Pesantren Assalam”, yang ditulis di bawah bimbingan Prof. Dr. H. Abdurrahman Mas’ud, M.A.",
    image_url: null,
    order_number: 6,
    metadata: { role: "pengasuh" },
  },
];

async function seedAboutData() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync();
    console.log("✅ Database synced");

    for (const section of aboutData) {
      await About.upsert(section);
    }

    console.log("✅ About data seeded successfully");
    console.log(`📝 Upserted ${aboutData.length} sections`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

seedAboutData();
