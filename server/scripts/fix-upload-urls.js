#!/usr/bin/env node
/**
 * Normalize all upload URLs in the database to /api/media/filename paths.
 */
require('../config/loadEnv');
const prisma = require('../prisma/client');
const { toMediaApiPath, extractUploadFilename } = require('../utils/mediaUrl');

function needsFix(url) {
  if (!url || !extractUploadFilename(url)) return false;
  return !String(url).startsWith('/api/media/');
}

async function main() {
  let profileCount = 0;
  let goalCount = 0;

  const profiles = await prisma.profile.findMany();
  for (const p of profiles) {
    const data = {};
    if (needsFix(p.avatarUrl)) {
      data.avatarUrl = toMediaApiPath(p.avatarUrl);
      profileCount++;
    }
    if (needsFix(p.coverUrl)) {
      data.coverUrl = toMediaApiPath(p.coverUrl);
      profileCount++;
    }
    if (Object.keys(data).length) {
      await prisma.profile.update({ where: { id: p.id }, data });
    }
  }

  const goals = await prisma.goal.findMany();
  for (const g of goals) {
    if (needsFix(g.imageUrl)) {
      await prisma.goal.update({
        where: { id: g.id },
        data: { imageUrl: toMediaApiPath(g.imageUrl) },
      });
      goalCount++;
    }
  }

  console.log(`✅ Normalized ${profileCount} profile fields and ${goalCount} goal images to /api/media/...`);
}

main()
  .catch((e) => {
    console.error('❌ fix-upload-urls failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
