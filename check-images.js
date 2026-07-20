require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sequelize = require('./config/database');

async function check() {
  await sequelize.authenticate();
  
  const UPLOADS_DIR = path.join(__dirname, 'uploads', 'images');
  
  // Cek 13 posts yang masih punya WP URL di content
  const [wpContent] = await sequelize.query(
    "SELECT id, title, content FROM posts WHERE content LIKE '%wp-content/uploads%' ORDER BY id"
  );
  
  console.log('Posts with WP URLs in content:', wpContent.length);
  console.log('');
  
  const wpUrlRegex = /https?:\/\/(?:www\.)?[^\/]+\/wp-content\/uploads\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi;
  
  for (const p of wpContent) {
    const matches = p.content.match(wpUrlRegex) || [];
    const uniqueUrls = [...new Set(matches)];
    console.log(`Post #${p.id}: ${p.title.substring(0, 60)}`);
    console.log(`  URLs found: ${uniqueUrls.length}`);
    
    for (const url of uniqueUrls) {
      // Check if local file exists
      const uploadsIndex = url.indexOf('/wp-content/uploads/');
      if (uploadsIndex !== -1) {
        const relativePath = url.substring(uploadsIndex + '/wp-content/uploads/'.length);
        const localFilename = relativePath.replace(/\//g, '-');
        const localPath = path.join(UPLOADS_DIR, localFilename);
        const exists = fs.existsSync(localPath);
        
        // Also check without size suffix
        const noSizePath = localFilename.replace(/-\d{2,4}x\d{2,4}(?=\.(jpg|jpeg|png|gif|webp)$)/i, '');
        const noSizeExists = fs.existsSync(path.join(UPLOADS_DIR, noSizePath));
        
        console.log(`    ${exists ? '[EXISTS]' : noSizeExists ? '[EXISTS-ALT]' : '[MISSING]'} ${url.substring(0, 120)}`);
        if (!exists) {
          console.log(`      Expected: ${localFilename}`);
        }
      }
    }
    console.log('');
  }
  
  await sequelize.close();
}
check().catch(e => console.error(e));
