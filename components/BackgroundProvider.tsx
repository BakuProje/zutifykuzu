'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/lib/store';
import { FastAverageColor } from 'fast-average-color';
import { getHighResImage } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useHasMounted } from '@/hooks/useHasMounted';

export function BackgroundProvider() {
  const hasMounted = useHasMounted();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const setDominantColor = usePlayerStore((state) => state.setDominantColor);
  const dominantColor = usePlayerStore((state) => state.dominantColor);
  const facRef = useRef<FastAverageColor | null>(null);

  useEffect(() => {
    if (!hasMounted || !currentTrack?.videoId) {
      setDominantColor(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      facRef.current = new FastAverageColor();
      // Use standard YouTube thumbnail - much more reliable for CORS and rate limits
      const imageUrl = `https://i.ytimg.com/vi/${currentTrack.videoId}/default.jpg`;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      img.onload = () => {
        if (!facRef.current) return;
        try {
          const color = facRef.current.getColor(img);
          if (color && color.hex) {
            setDominantColor(color.hex);
          }
        } catch (e) {
          // Fallback silently
        } finally {
          facRef.current?.destroy();
          facRef.current = null;
        }
      };

      img.onerror = () => {
        facRef.current?.destroy();
        facRef.current = null;
        // Fallback to a default dark color or nothing
        setDominantColor(null);
      };
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      facRef.current?.destroy();
      facRef.current = null;
    };
  }, [currentTrack?.videoId, setDominantColor, hasMounted]);

  return (
    <div className="fixed inset-0 -z-50 bg-[#050505] overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(250, 36, 60, 0.12) 0%, #050505 80%)'
        }}
      />
    </div>
  );
}
