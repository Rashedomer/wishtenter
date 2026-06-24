/**
 * One-time script: normalize all /uploads/... image URLs in DB to /api/media/...
 * Run once on Railway after deploying the fix:
 *   node server/scratch/normalize-db-urls.js
 */
require('../config/loadEnv');
const prisma = require('../prisma/client');

function toApiMedia(url) {
  if (!url) return url;
  const m = String(url).match(/\/(?:uploads|api\/media)\/([^/?#]+)/i);
  if (!m) return url;
  return `/api/media/${m[1]}`;
}

async function main() {
  console.log('🔧 Normalizing image URLs in database...\n');

  // --- Profiles ---
  const profiles = await prisma.profile.findMany({
    where: {
      OR: [
        { avatarUrl: { contains: '/uploads/' } },
        { coverUrl:  { contains: '/uploads/' } },
      ],
    },
    select: { id: true, avatarUrl: true, coverUrl: true },
  });

  console.log(`Found ${profiles.length} profiles with /uploads/ URLs`);
  for (const p of profiles) {
    await prisma.profile.update({
      where: { id: p.id },
      data: {
        avatarUrl: toApiMedia(p.avatarUrl),
        coverUrl:  toApiMedia(p.coverUrl),
      },
    });
    console.log(`  Profile ${p.id}: avatarUrl=${p.avatarUrl} → ${toApiMedia(p.avatarUrl)}`);
  }

  // --- Goals ---
  const goals = await prisma.goal.findMany({
    where: { imageUrl: { contains: '/uploads/' } },
    select: { id: true, imageUrl: true },
  });

  console.log(`\nFound ${goals.length} goals with /uploads/ URLs`);
  for (const g of goals) {
    await prisma.goal.update({
      where: { id: g.id },
      data: { imageUrl: toApiMedia(g.imageUrl) },
    });
    console.log(`  Goal ${g.id}: ${g.imageUrl} → ${toApiMedia(g.imageUrl)}`);
  }

  console.log('\n✅ Done!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
