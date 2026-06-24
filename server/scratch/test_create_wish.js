require('dotenv').config();
const prisma = require('../prisma/client');

async function main() {
  const username = 'kinza_coder'; // From screenshot
  const profile = await prisma.profile.findUnique({ where: { username } });
  
  if (!profile) {
    console.error('Profile not found');
    return;
  }

  try {
    const goal = await prisma.goal.create({
      data: {
        title: 'Test Wish',
        description: 'Test description',
        targetAmount: 500,
        imageUrl: '',
        creatorId: profile.id,
      },
    });
    console.log('Goal created successfully:', goal.id);
  } catch (err) {
    console.error('Error creating goal:', err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
