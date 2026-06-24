import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { profilePath } from '@/lib/profileUrl';

/** Client-side fallback when /share/:username is opened in-app (Vercel serves OG HTML to crawlers). */
export default function ShareRedirect() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  if (!username) return <Navigate to="/explore" replace />;

  const wish = searchParams.get('wish');
  const target = wish
    ? `${profilePath(username)}?wish=${encodeURIComponent(wish)}`
    : profilePath(username);

  return <Navigate to={target} replace />;
}
