'use client';

import { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';

interface ImageWithFallbackProps extends ImageProps {
  fallbackSrc?: string;
}

export function ImageWithFallback({ src, fallbackSrc, alt, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  // Use alt text or src as seed so each different song gets a unique fallback image deterministically
  const seed = encodeURIComponent(
    alt?.toString() || 
    (typeof src === 'string' ? src : '') || 
    'default'
  );
  const fallback = fallbackSrc || `https://picsum.photos/seed/${seed}/400/400`;

  return (
    <Image
      {...props}
      src={error ? fallback : imgSrc}
      alt={alt ?? ""}
      onError={() => {
        if (typeof imgSrc === 'string' && imgSrc.includes('maxresdefault.jpg')) {
          setImgSrc(imgSrc.replace('maxresdefault.jpg', 'hqdefault.jpg'));
        } else if (!error) {
          setError(true);
        }
      }}
    />
  );
}
