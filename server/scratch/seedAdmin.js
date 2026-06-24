require('dotenv').config({ path: './.env' });
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');

async function main() {
  const adminEmail = 'admin@wishtenter.com';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
      profile: {
        create: {
          username: 'admin',
          displayName: 'System Admin',
        }
      }
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log('📧 Email:', adminEmail);
  console.log('🔑 Password:', adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
