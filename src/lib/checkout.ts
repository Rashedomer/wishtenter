import api from '@/lib/api';

export async function startWishCheckout(
  goalId: string,
  creatorUsername: string,
  message?: string,
  amount?: number
): Promise<void> {
  const res = await api.post('/stripe/create-checkout-session', {
    goalId,
    creatorUsername,
    message: message || '',
    amount,
  });
  if (res.data?.url) {
    window.location.href = res.data.url;
    return;
  }
  throw new Error('Invalid checkout response');
}

/** Confirm payment after Stripe redirect — records tip, message & pending balance if webhook missed */
export async function confirmCheckoutSession(sessionId: string) {
  const res = await api.post('/stripe/confirm-session', { sessionId });
  return res.data;
}

/** Sync missed Stripe tips into dashboard (creator only) */
export async function syncCreatorPayments(force = false) {
  const res = await api.post('/stripe/sync-payments', force ? { force: true } : {});
  return res.data as {
    synced: number;
    alreadySynced: number;
    totalFound?: number;
    totalInDb?: number;
    throttled?: boolean;
  };
}

export function getGiftCommission(gift: {
  amount: number;
  netAmount?: number;
  commissionAmount?: number;
}): number {
  if (gift.commissionAmount != null && gift.commissionAmount > 0) {
    return gift.commissionAmount;
  }
  return Math.max(0, gift.amount - (gift.netAmount ?? gift.amount));
}
