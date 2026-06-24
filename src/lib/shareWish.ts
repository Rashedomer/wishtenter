import { toPublicShareUrl } from '@/lib/shareUrl';

/** Copy or native-share a wish link. Returns how it was shared. */
export async function shareWishLink(
  title: string,
  url: string
): Promise<'shared' | 'copied'> {
  const publicUrl = toPublicShareUrl(url);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: `${title} — Wishtenter`,
        text: 'Support this wish on Wishtenter',
        url: publicUrl,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
    }
  }

  await navigator.clipboard.writeText(publicUrl);
  return 'copied';
}
