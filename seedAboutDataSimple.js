const sequelize = require('./config/database');
const { About } = require('./schema');

const aboutData = [
  {
    section_key: 'main_intro',
    title: 'Tentang Pesantren',
    content: 'Pesantren Riset Al-Muhtada adalah pesantren mahasiswa di Semarang yang bertujuan untuk mencetak Muslim intelektual yang berakhlak mulia, berprestasi, dan memiliki keterampilan riset unggul. Dengan lingkungan kondusif, asrama putera dan puteri terpisah, serta bebas biaya asrama, santri dibimbing oleh pengasuh dan guru lulusan S2/S3 dari dalam maupun luar negeri.',
    order_number: 1
  },
  {
    section_key: 'founders',
    title: 'Pendiri',
    content: 'Pesantren ini didirikan oleh Ustadz Dr. H. Dani Muhtada, M.Ag., M.A., M.P.A dan Ustadzah Hikmiyatin Jalilah, S.Ag., M.Ag. pada 12 Agustus 2018, di bawah Yayasan Kanzul Amal Al-Muhtad. Berdiri dengan Akta Notaris Teguh Pambudi, S.H., M.Kn. Nomor 26 (21 Oktober 2020) dan disahkan Kementerian Hukum & HAM melalui Keputusan Nomor AHU-0001360.AH.01.05 Tahun 2021.',
    order_number: 2
  },
  {
    section_key: 'vision',
    title: 'Visi',
    content: 'Menjadi pesantren unggulan yang mencetak mahasiswa muslim intelektual yang beriman, berbudi, dan berprestasi',
    order_number: 3
  },
  {
    section_key: 'mission',
    title: 'Misi',
    content: JSON.stringify([
      'Mencetak insan akademis melalui kegiatan pengajaran, diskusi, dan pelatihan.',
      'Mengembangkan nalar kritis-analitis melalui riset wajib tahunan.',
      'Menanamkan jiwa pengabdian melalui kegiatan sosial kemasyarakatan.',
      'Menanamkan nilai keislaman, keummatan, dan kebangsaan dalam kehidupan.'
    ]),
    metadata: { type: 'list' },
    order_number: 4
  },
  {
    section_key: 'founder_ustadz',
    title: 'Ustadz Dr. H. Dani Muhtada, M.Ag., M.A., M.P.A.',
    content: 'Beliau adalah dosen Fakultas Hukum Universitas Negeri Semarang (UNNES). Pendidikan dasar dan menengah beliau tempuh di Banyuwangi dan Jember. Gelar S1 dan S2 diperoleh dari Fakultas Syariah IAIN Walisongo Semarang. Beliau juga menyelesaikan MA di UIN Sunan Kalijaga Yogyakarta bekerjasama dengan McGill University Canada. Gelar MPA didapat dari Flinders University, Australia, dan gelar doktor diperoleh dari Northern Illinois University, Amerika Serikat, dengan disertasi tentang Politik Hukum Islam di Indonesia.',
    image_url: 'https://via.placeholder.com/150',
    order_number: 5
  },
  {
    section_key: 'founder_ustadzah',
    title: 'Ustadzah Hikmiyatin Jalilah, S.Ag., M.Ag.',
    content: 'Beliau adalah pengasuh putri Pesantren Riset Al-Muhtada. Gelar sarjana dan magister beliau peroleh dari UIN Walisongo Semarang dengan fokus kajian Ilmu Al-Quran dan Tafsir. Beliau aktif dalam berbagai kegiatan dakwah dan pengajaran, serta membimbing mahasantri putri dalam pengembangan keilmuan dan karakter.',
    image_url: 'https://via.placeholder.com/150',
    order_number: 6
  }
];

async function seedAboutData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync();
    console.log('✅ Database synced');

    // Clear existing data
    await About.destroy({ where: {} });
    console.log('🗑️  Cleared existing about data');

    // Insert new data
    await About.bulkCreate(aboutData);
    console.log('✅ About data seeded successfully');
    console.log(`📝 Inserted ${aboutData.length} sections`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedAboutData();
