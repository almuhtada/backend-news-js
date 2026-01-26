const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: false
});

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function countSentences(text) {
  const plainText = stripHtml(text);
  const matches = plainText.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

(async () => {
  try {
    // Get the post from the example (ID 6)
    const [posts] = await sequelize.query(`
      SELECT id, title, content
      FROM posts
      WHERE id = 6
      LIMIT 1
    `);

    if (posts.length > 0) {
      const post = posts[0];
      const paragraphs = post.content.split(/\r\n\r\n|\n\n/).map(p => p.trim()).filter(p => p.length > 0);

      console.log('\n📝 Sample Post Analysis (ID: ' + post.id + ')');
      console.log('Title: ' + post.title);
      console.log('\nContent Structure:');
      console.log('   Total paragraphs: ' + paragraphs.length);

      paragraphs.forEach((para, i) => {
        const sentences = countSentences(para);
        const preview = stripHtml(para).substring(0, 80);
        console.log(`   ${i + 1}. [${sentences} sentences] ${preview}...`);
      });
    }

    // Get statistics for cleaned posts
    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_posts,
        AVG(LENGTH(content)) as avg_content_length
      FROM posts
      WHERE status = 'publish' AND content IS NOT NULL
    `);

    console.log('\n📊 Overall Statistics:');
    console.log('   Total published posts: ' + stats[0].total_posts);
    console.log('   Average content length: ' + Math.round(stats[0].avg_content_length) + ' characters');

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();
