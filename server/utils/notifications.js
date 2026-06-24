const prisma = require('../prisma/client');

async function createNotification(userId, { type, title, body, link = null, meta = null }) {
  if (!userId) return null;
  try {
    return await prisma.notification.create({
      data: { userId, type, title, body, link, meta },
    });
  } catch (err) {
    console.error('[Notification] create failed:', err.message);
    return null;
  }
}

module.exports = { createNotification };
