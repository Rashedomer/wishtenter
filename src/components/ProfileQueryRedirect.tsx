import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { profilePath } from '@/lib/profileUrl';

/**
 * Vercel only serves index.html at `/` — deep links like /Username 404.
 * Share pages redirect humans here with ?p=username so the SPA can route client-side.
 */
export default function ProfileQueryRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const username = searchParams.get('p') || searchParams.get('profile');

  useEffect(() => {
    if (!username?.trim()) return;
    const wish = searchParams.get('wish');
    const target = wish
      ? `${profilePath(username)}?wish=${encodeURIComponent(wish)}`
      : profilePath(username);
    navigate(target, { replace: true });
  }, [username, searchParams, navigate]);

  return null;
}
