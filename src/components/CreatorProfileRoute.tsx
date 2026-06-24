import { lazy, Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { isReservedProfileSlug } from '@/lib/profileUrl';

const CreatorProfile = lazy(() => import('@/pages/CreatorProfile'));

/** Public creator page at /:username (no /u prefix) */
export default function CreatorProfileRoute() {
  const { username } = useParams<{ username: string }>();

  if (!username || isReservedProfileSlug(username)) {
    return <Navigate to="/explore" replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CreatorProfile />
    </Suspense>
  );
}
