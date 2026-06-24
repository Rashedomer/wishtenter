const prisma = require('../prisma/client');

async function getCommissionSettings() {
  let settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: { id: 'singleton', commissionRate: 0.15 },
    });
  } else if (settings.commissionRate === 0.10) {
    settings = await prisma.systemSettings.update({
      where: { id: 'singleton' },
      data: { commissionRate: 0.15 },
    });
  }
  return settings;
}

function calculateCommission(grossAmount, commissionRate) {
  const gross = parseFloat(grossAmount);
  const commission = Math.round(gross * commissionRate * 100) / 100;
  const net = Math.round((gross - commission) * 100) / 100;
  return { gross, commission, net, commissionRate };
}

module.exports = { getCommissionSettings, calculateCommission };
