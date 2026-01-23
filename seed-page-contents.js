require('dotenv').config({ path: __dirname + '/.env' });
const sequelize = require('./config/database');
const PageContent = require('./schema/pageContent');

const defaultGriyaQuranContent = {
  header: {
    title: "Griya Qur'an Hidayatul Muhtadin",
    description: "Lembaga pembelajaran Al-Qur'an di bawah Yayasan Kanzul Al-Muhtad, berpusat di Semarang, dengan tujuan mencetak generasi Muslim penghafal Al-Qur'an yang berakhlakul karimah.",
    address: 'Jl. Kutai No.8 Taman Baru Banyuwangi, Jawa Timur',
    phone: '0819-9772-0092',
  },
  vpiMisi: {
    visi: 'Menjadi tempat pencetak Generasi Qurani yang gemar mengaji dan mengkaji Al-Quran serta berprestasi',
    misi: [
      'Mencetak generasi pecinta dan penghafal Al-Quran',
      'Menjadikan generasi Qurani berakhlaqul karimah',
      'Memberikan manfaat melalui kajian Islami untuk masyarakat',
      'Menanamkan nilai-nilai Islami dalam kehidupan',
    ],
  },
  programs: [
    { title: 'Tahsin & Tartil', description: 'Fokus pada tajwid, makharijul huruf, dan hukum bacaan.', schedule: 'Rabu & Kamis (15.00 - 17.30)' },
    { title: 'Tahfidz 30 Juz', description: "Program menghafal Al-Qur'an dengan metode At-Taisir.", schedule: "Senin, Selasa & Jum'at (15.00 - 17.30)" },
    { title: 'Ibadah & Karakter', description: 'Pembelajaran dasar ibadah, akhlak, dan pembentukan karakter.', schedule: 'Selasa (17.30 - 19.30)' },
  ],
  halaqah: [
    { name: 'Shufla', description: 'Untuk usia TK' },
    { name: 'Wustho', description: 'Untuk usia SD' },
    { name: "'Ulya", description: 'Untuk santri yang sudah lancar membaca' },
  ],
};

const defaultProgramPengajarContent = {
  header: {
    title: 'Program & Pengajar',
    description: 'Informasi mengenai program pesantren, dewan masyayikh, asatidz, hingga tim mentor yang berpengalaman dan berkualitas.',
  },
  programs: [
    'Kajian Agama: Tauhid, Tafsir, Hadits, Fiqh, dan Akhlaq',
    'Kajian Sosial dan Analisis Kritis Masalah Aktual',
    'Pelatihan Riset dan Menulis Karya Ilmiah',
    'Pelatihan Bahasa Inggris dan Bahasa Arab',
    'Pelatihan Presentasi dan Public Speaking',
    'Program Penelitian dan Pengabdian Masyarakat secara Berkala',
    'Bimbingan Beasiswa S2/S3 Dalam & Luar Negeri',
  ],
  masyayikh: [
    'Dr. H. Dani Muhtada, M.Ag., M.A., M.P.A.',
    "Dr. H. A. Hasan Asy'ari Ulama'i, M.Ag.",
    'Prof. Dr. Ahwan Fanani, M.Ag., M.S.',
    'Dr. H. M. Hakim Junaidi, M.Ag.',
    'Dr. H. Mohammad Nasih, M.Si.',
    'Dr. H. Sukendar, M.Ag., M.A.',
    'Dr. H. Aji Sofanudin, M.Si.',
  ],
  asatidz: [
    'Dr. Imam Baehaqie, M.Hum.',
    'Hikmiyatin Jalilah, S.Ag., M.Ag.',
    'Asma Luthfi, S.Th.I., M.Hum.',
    'Ayon Diniyanto, S.H., M.H.',
    'Dwi Wisnu Kurniawan, S.H.',
    'Rikha Zulia, S.Pd.',
    'Wihda Ikvina Anfaul Umat, S.Pd.',
    "In'am Zaidi, S.H., M.H.",
  ],
  pengurus: [
    { role: 'Sekretaris Pesantren', name: 'Dwi Wisnu Kurniawan, S.H., M.H.' },
    { role: 'Divisi IT dan Humas', name: 'M. Akiyasul Azkiya, S.Kom.' },
    { role: 'Divisi Program', name: 'Eka Diyanti' },
  ],
  mentors: [
    'Mohammad Rizal Ardiansyah, S.Si.',
    'Gema Aditya Mahendra, S.T.',
    'Mohammad Fattahul Alim, S.E.',
    'Mohammad Khollaqul Alim, S.E.',
    'Zahrotuz Zakiyah, S.Pd.',
    'Tia Rosalita, S.Pd.',
  ],
  ctaText: 'Jadilah bagian dari komunitas pesantren yang berkembang dan belajar dari para pengajar terbaik.',
};

const defaultPendaftaranContent = {
  header: {
    title: 'Pendaftaran Mahasantri Baru 2025',
    description: 'Pesantren Riset Al-Muhtada — Jelaskan persyaratan, mekanisme pendaftaran, dan tata cara konfirmasi.',
  },
  formLink: 'https://linktr.ee/OPRECSABA25',
  registrationFee: 'Rp30.000,-',
  timelineStart: '15 April 2025',
  timelineEnd: '21 Juli 2025',
  requirements: [
    'Mahasiswa Universitas Negeri Semarang Angkatan 2025',
    'Laki-laki atau perempuan',
    'Beragama Islam',
    "Bisa membaca Al-Qur'an",
    'Tidak merokok',
    'Bersedia mematuhi tata tertib pesantren',
    'Bersedia mengikuti program Pesantren Riset Al-Muhtada',
  ],
  accounts: [
    { bank: 'BRI', number: '386201028545536', name: 'Nayla Syarifa' },
    { bank: 'BSI', number: '7235009492', name: 'Nayla Syarifa' },
    { bank: 'BTN', number: '108901610110387', name: 'Azizah Fiqriyatul Mujahidah' },
    { bank: 'Dana', number: '081998925631', name: 'Azizah Fiqriyatul Mujahidah' },
    { bank: 'Gopay', number: '085819704766', name: 'Azizah Fiqriyatul Mujahidah' },
    { bank: 'ShopeePay', number: '081998925631', name: 'Azizah Fiqriyatul Mujahidah' },
  ],
  whatsappContacts: [
    { name: 'Abian', number: '083176608687' },
    { name: 'Syarifa', number: '085935271192' },
  ],
  steps: [
    'Isi formulir online di link pendaftaran.',
    'Lakukan pembayaran biaya pendaftaran (Rp30.000) ke salah satu rekening di atas.',
    'Konfirmasi pembayaran via WhatsApp ke kontak di samping dengan format PRM_Nama_Prodi_Alamat.',
    "Seleksi: wawancara & tes baca Al-Qur'an.",
    'Pengumuman hasil seleksi akan diberitahukan via WhatsApp & laman resmi.',
  ],
};

async function seed() {
  await sequelize.sync();

  await PageContent.upsert({
    page_key: 'griya-quran',
    title: "Griya Qur'an",
    content: defaultGriyaQuranContent,
    status: 'publish'
  });
  console.log('✓ griya-quran seeded');

  await PageContent.upsert({
    page_key: 'program-pengajar',
    title: 'Program & Pengajar',
    content: defaultProgramPengajarContent,
    status: 'publish'
  });
  console.log('✓ program-pengajar seeded');

  await PageContent.upsert({
    page_key: 'pendaftaran',
    title: 'Pendaftaran',
    content: defaultPendaftaranContent,
    status: 'publish'
  });
  console.log('✓ pendaftaran seeded');

  const count = await PageContent.count();
  console.log('Total records:', count);

  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
