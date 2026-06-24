require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@wishtenter.com';
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`❌ User with email ${email} not found.`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { 
      role: 'ADMIN',
      isVerified: true
    }
  });

  console.log(`✅ User ${email} has been promoted to ADMIN and verified!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
