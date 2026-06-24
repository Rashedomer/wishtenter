import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { profilePath } from '@/lib/profileUrl';

/** Old links: /u/:username → /:username (preserves ?payment=, ?wish=, etc.) */
export default function LegacyProfileRedirect() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  if (!username) return <Navigate to="/explore" replace />;
  const query = searchParams.toString();
  const target = query ? `${profilePath(username)}?${query}` : profilePath(username);
  return <Navigate to={target} replace />;
}
