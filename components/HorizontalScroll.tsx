'use client';

import { Track, usePlayerStore } from '@/lib/store';
import { ImageWithFallback } from './ImageWithFallback';
import { getHighResImage, getBestThumbnail } from '@/lib/utils';
import { Play, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { MarqueeText } from './MarqueeText';
import { useRouter } from 'next/navigation';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';

export function HorizontalScroll({ title, tracks }: { title: string; tracks: Track[] }) {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const router = useRouter();
  const dragProps = useDraggableScroll<HTMLDivElement>({ autoScroll: true, autoScrollInterval: 4000 });

  let headerContent = <h2 className="text-xl font-bold text-white mb-4 px-4">{title}</h2>;

  if (title.startsWith('Serupa dengan ')) {
    const mainTitle = title.replace('Serupa dengan ', '');
    const headerImage = getHighResImage(tracks[0]?.thumbnails?.[0]?.url, 100);
    
    let artistId = '';
    for (const track of tracks) {
      if (track.artist && !Array.isArray(track.artist) && track.artist.artistId) {
        artistId = track.artist.artistId;
        break;
      } else if (Array.isArray(track.artist) && track.artist[0]?.artistId) {
        artistId = track.artist[0].artistId;
        break;
      }
    }

    const handleHeaderClick = () => {
      if (artistId) {
        router.push(`/artist/${artistId}`);
      } else {
        router.push(`/search?q=${encodeURIComponent(mainTitle)}`);
      }
    };

    headerContent = (
      <div 
        className="flex items-center justify-between mb-4 px-4 cursor-pointer group"
        onClick={handleHeaderClick}
      >
        <div className="flex items-center gap-4">
          {headerImage && (
            <div className="w-14 h-14 rounded-md overflow-hidden relative shrink-0">
              <ImageWithFallback src={headerImage} alt={mainTitle} fill className="object-cover" />
            </div>
          )}
          <div className="flex flex-col justify-center">
            <span className="text-sm text-white/70 font-medium">Serupa dengan</span>
            <h2 className="text-2xl font-bold text-white leading-tight">{mainTitle}</h2>
          </div>
        </div>
        <button className="p-2 text-white/70 group-hover:text-white transition-colors">
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-12">
      {headerContent}
      <div 
        {...dragProps}
        className="flex overflow-x-auto no-scrollbar gap-5 px-6 pb-6 select-none"
      >
        {tracks.map((track, i) => {
          const thumbnail = getBestThumbnail(track.thumbnails, 400, track.videoId);
          const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || 'Unknown Artist';

          return (
            <motion.div
              key={`${track.videoId}-${i}`}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
              className="flex-none w-40 sm:w-44 cursor-pointer group"
              onClick={() => playTrack(track, tracks)}
            >
              <div className="relative aspect-square rounded-[1.75rem] overflow-hidden mb-3.5 premium-shadow group-hover:scale-[1.03] transition-all duration-500">
                <ImageWithFallback 
                  src={thumbnail} 
                  alt={track.name} 
                  fill 
                  sizes="(max-width: 640px) 160px, 176px" 
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 glass rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-6 h-6 text-white ml-1 fill-current" />
                  </div>
                </div>
              </div>
              <MarqueeText text={track.name} className="text-[15px] font-bold text-white tracking-tight leading-snug" />
              <MarqueeText text={artistName} className="text-[13px] font-medium text-white/40 mt-1" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

