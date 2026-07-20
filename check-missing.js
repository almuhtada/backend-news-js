require('dotenv').config();
const sequelize = require('./config/database');

async function check() {
  try {
    await sequelize.authenticate();
    
    // Cari post WordPress yang TIDAK ada di clean table
    const [missing] = await sequelize.query(`
      SELECT wp.ID, wp.post_title, wp.post_name as slug, wp.post_status, wp.post_date,
             wp.post_author
      FROM wp8o_posts wp
      LEFT JOIN posts p ON p.wp_post_id = wp.ID
      WHERE wp.post_type = 'post' 
        AND wp.post_status IN ('publish', 'draft', 'pending')
        AND p.id IS NULL
      ORDER BY wp.post_date DESC
      LIMIT 30
    `);
    
    console.log('Missing posts (first 30):');
    missing.forEach(m => {
      console.log(`  ID: ${m.ID} | slug: ${m.slug} | status: ${m.post_status} | date: ${m.post_date}`);
    });
    
    // Cek apakah ada slug duplikat di WP
    const [dupSlugs] = await sequelize.query(`
      SELECT wp.post_name as slug, COUNT(*) as cnt
      FROM wp8o_posts wp
      WHERE wp.post_type = 'post' AND wp.post_status IN ('publish', 'draft', 'pending')
      GROUP BY wp.post_name
      HAVING cnt > 1
      ORDER BY cnt DESC
      LIMIT 20
    `);
    
    console.log('\nDuplicate slugs in WP posts:', dupSlugs.length);
    dupSlugs.forEach(d => console.log(`  slug: ${d.slug} | count: ${d.cnt}`));

    // Cek apakah slug dari missing posts sudah ada di clean table
    if (missing.length > 0) {
      const missingSlugs = missing.map(m => sequelize.escape(m.slug)).join(',');
      const [existingBySlug] = await sequelize.query(`
        SELECT id, slug, wp_post_id FROM posts WHERE slug IN (${missingSlugs})
      `);
      console.log('\nMissing posts that already exist in clean table by slug:', existingBySlug.length);
      existingBySlug.forEach(e => console.log(`  id: ${e.id} | slug: ${e.slug} | wp_post_id: ${e.wp_post_id}`));
    }
    
    // Total missing
    const [totalMissing] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM wp8o_posts wp
      LEFT JOIN posts p ON p.wp_post_id = wp.ID
      WHERE wp.post_type = 'post' 
        AND wp.post_status IN ('publish', 'draft', 'pending')
        AND p.id IS NULL
    `);
    console.log('\nTotal missing posts:', totalMissing[0].count);
    
    await sequelize.close();
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
}
check();
