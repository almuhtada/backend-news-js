const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');
const User = require('./schema/user');

async function seedAdminUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync();
    console.log('✅ Database synced');

    // Check if admin already exists (by username or email)
    let existingAdmin = await User.findOne({
      where: {
        username: 'admin_almuhtada'
      }
    });

    if (!existingAdmin) {
      existingAdmin = await User.findOne({
        where: {
          email: 'admin@almuhtada.com'
        }
      });
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    if (existingAdmin) {
      // Update existing admin with new bcrypt password
      await existingAdmin.update({
        email: 'admin@almuhtada.com',
        password: hashedPassword,
        role: 'administrator',
        display_name: 'Administrator'
      });
      console.log('✅ Admin user updated successfully');
      console.log('👤 Username: admin_almuhtada');
      console.log('📧 Email: admin@almuhtada.com');
      console.log('🔑 Password: admin123');
    } else {
      // Create new admin user
      const admin = await User.create({
        username: 'admin_almuhtada_new',
        email: 'admin@almuhtada.com',
        password: hashedPassword,
        display_name: 'Administrator',
        role: 'administrator'
      });
      console.log('✅ Admin user created successfully');
      console.log('👤 Username: admin_almuhtada_new');
      console.log('📧 Email: admin@almuhtada.com');
      console.log('🔑 Password: admin123');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdminUser();
