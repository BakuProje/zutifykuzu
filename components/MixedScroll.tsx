import { Play, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { getHighResImage, getBestThumbnail, cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { MarqueeText } from './MarqueeText';
import { usePlayerStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';

interface MixedScrollProps {
  title: string;
  items: any[];
}

export function MixedScroll({ title, items }: MixedScrollProps) {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const router = useRouter();
  const dragProps = useDraggableScroll<HTMLDivElement>({ autoScroll: true, autoScrollInterval: 4000 });

  if (!items || items.length === 0) return null;

  let headerContent = <h2 className="text-xl font-bold text-white mb-4 px-4">{title}</h2>;

  if (title.startsWith('Serupa dengan ')) {
    const mainTitle = title.replace('Serupa dengan ', '');
    const headerImage = getHighResImage(items[0]?.thumbnails?.[0]?.url, 100);
    
    let artistId = '';
    for (const item of items) {
      if (item.type === 'ARTIST' && item.artistId) {
        artistId = item.artistId;
        break;
      } else if (item.artist?.artistId) {
        artistId = item.artist.artistId;
        break;
      } else if (Array.isArray(item.artist) && item.artist[0]?.artistId) {
        artistId = item.artist[0].artistId;
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
        {items.map((item, i) => {
          const type = item.type;
          const isArtist = type === 'ARTIST';
          const isPlaylist = type === 'PLAYLIST';
          const isAlbum = type === 'ALBUM';
          const isSong = type === 'SONG' || type === 'VIDEO';

          const titleText = item.name || item.title || 'Unknown';
          const subtitleText = isArtist 
            ? 'Artist' 
            : isPlaylist 
              ? 'Playlist' 
              : isAlbum 
                ? 'Album' 
                : Array.isArray(item.artist) 
                  ? item.artist.map((a: any) => a.name).join(', ') 
                  : item.artist?.name || 'Song';

          const handleClick = () => {
            if (isArtist && item.artistId) {
              router.push(`/artist/${item.artistId}`);
            } else if (isPlaylist && item.playlistId) {
              router.push(`/playlist/${item.playlistId}`);
            } else if (isAlbum && item.albumId) {
              router.push(`/album/${item.albumId}`);
            } else if (isSong && item.videoId) {
              playTrack(item, [item], 'similar');
            }
          };

          return (
            <motion.div
              key={`${item.videoId || item.playlistId || item.albumId || item.artistId}-${i}`}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
              className="flex-none w-40 sm:w-44 cursor-pointer group"
              onClick={handleClick}
            >
              <div className={cn(
                "relative aspect-square overflow-hidden mb-3.5 premium-shadow transition-all duration-500 group-hover:scale-[1.03]",
                isArtist ? 'rounded-full ring-4 ring-white/5 group-hover:ring-[#FA243C]/30' : 'rounded-[1.75rem]'
              )}>
                <ImageWithFallback 
                  src={getBestThumbnail(item.thumbnails, 400, item.videoId || item.playlistId || item.albumId || item.artistId)} 
                  alt={titleText} 
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
              <div className="w-full">
                <MarqueeText text={titleText} className="text-[15px] font-bold text-white tracking-tight leading-snug" />
                <MarqueeText text={subtitleText} className={cn("text-[13px] font-medium mt-1", isArtist ? "text-[#FA243C] uppercase tracking-widest text-[10px]" : "text-white/40")} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

