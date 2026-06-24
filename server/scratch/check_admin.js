require('dotenv').config();
const prisma = require('../prisma/client');

async function checkAdmin() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });
    console.log('Admins:', JSON.stringify(admins, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkAdmin();
