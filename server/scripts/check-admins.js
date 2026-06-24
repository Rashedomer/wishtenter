require('dotenv').config();
const prisma = require('../prisma/client');

async function checkAdmins() {
  const users = await prisma.user.findMany({
    where: { role: 'ADMIN' }
  });
  console.log('--- Registered Admins ---');
  if (users.length === 0) {
    console.log('No admins found in database!');
  } else {
    users.forEach(u => console.log(`- ${u.email}`));
  }
}

checkAdmins()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
