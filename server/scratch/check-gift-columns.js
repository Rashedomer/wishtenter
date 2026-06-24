require('dotenv').config();
const prisma = require('../prisma/client');

async function main() {
  try {
    const gift = await prisma.gift.findFirst();
    console.log('Successfully queried Gift table. Sample record:', gift);
  } catch (err) {
    console.error('Error querying Gift table:', err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
