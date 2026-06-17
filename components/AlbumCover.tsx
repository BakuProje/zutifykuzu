'use client';

import { ImageWithFallback } from './ImageWithFallback';
import { getHighResImage } from '@/lib/utils';

interface AlbumCoverProps {
  src: string;
  alt: string;
}

export function AlbumCover({ src, alt }: AlbumCoverProps) {
  return (
    <div className="relative w-64 h-64 rounded-xl overflow-hidden shadow-2xl mb-6">
      <ImageWithFallback 
        src={getHighResImage(src, 800)} 
        alt={alt} 
        fill 
        sizes="(max-width: 640px) 100vw, 300px" 
        className="object-cover" 
        priority
      />
    </div>
  );
}
