#!/usr/bin/env node
/**
 * Create or reset the production admin user (non-interactive).
 * Usage: ADMIN_EMAIL=admin@wishtenter.com ADMIN_PASSWORD=secret node server/scripts/ensure-admin.js
 */
require('../config/loadEnv');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@wishtenter.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const username = process.env.ADMIN_USERNAME || 'admin';
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'System Admin';

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { profile: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    if (!existing.profile) {
      let finalUsername = username;
      if (await prisma.profile.findUnique({ where: { username: finalUsername } })) {
        finalUsername = `admin_${Date.now().toString().slice(-6)}`;
      }
      await prisma.profile.create({
        data: { userId: existing.id, username: finalUsername, displayName },
      });
    }
    console.log(`✅ Admin account restored (password reset): ${email}`);
  } else {
    let finalUsername = username;
    if (await prisma.profile.findUnique({ where: { username: finalUsername } })) {
      finalUsername = `admin_${Date.now().toString().slice(-6)}`;
    }
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
        profile: { create: { username: finalUsername, displayName } },
      },
    });
    console.log(`✅ New admin account created: ${email}`);
  }
  console.log(`\n📧 Login email:    ${email}`);
  console.log(`🔑 Login password: (value of ADMIN_PASSWORD in .env)`);
  console.log('🔗 Admin panel:    https://wishtenter.com/admin\n');
}

main()
  .catch((e) => {
    console.error('❌ ensure-admin failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
