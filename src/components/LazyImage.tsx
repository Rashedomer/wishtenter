import { useState, useRef, useEffect } from 'react';
import { resolveMediaUrl, handleMediaError } from '@/lib/mediaUrl';

type LazyImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
};

/**
 * LazyImage – True lazy load via IntersectionObserver.
 * Shows an animated skeleton placeholder until the image is in-view and loaded.
 * className/style are applied to the outer wrapper div so rounded-*, overflow-hidden
 * and dimension classes from parent containers work correctly.
 */
export function LazyImage({ src, alt = '', className, style, ...props }: LazyImageProps) {
  const resolved = src ? resolveMediaUrl(src) : '';
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resolved) return;
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' } // preload 250px before entering the viewport
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [resolved]);

  if (!resolved) return null;

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className ?? ''}`}
      style={style}
      aria-label={alt}
    >
      {/* Animated skeleton while not yet loaded */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Only create the <img> when in viewport */}
      {isInView && (
        <img
          src={resolved}
          alt={alt}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            handleMediaError(e, alt);
            setIsLoaded(true);
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
          style={undefined}
        />
      )}
    </div>
  );
}
