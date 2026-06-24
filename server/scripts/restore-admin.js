require('dotenv').config();
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const adminEmail = 'admin@wishtenter.com';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  console.log(`🚀 Restoring Admin Credentials for ${adminEmail}...`);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true
    }
  });

  console.log('✅ Admin credentials restored successfully!');
  console.log(`📧 Email: ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log('⚠️  Please change your password after logging in.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
