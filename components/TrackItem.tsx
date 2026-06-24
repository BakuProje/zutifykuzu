'use client';

import { Track, usePlayerStore } from '@/lib/store';
import { MoreVertical } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { getBestThumbnail } from '@/lib/utils';
import { MarqueeText } from './MarqueeText';

export function TrackItem({ 
  track, 
  queue, 
  onRemove,
  onDownload
}: { 
  track: Track; 
  queue?: Track[]; 
  onRemove?: (track: Track) => void;
  onDownload?: (track: Track) => void;
}) {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setTrackMenu = usePlayerStore((state) => state.setTrackMenu);
  const isCurrent = currentTrack?.videoId === track.videoId;

  const thumbnail = getBestThumbnail(track.thumbnails, 200, track.videoId);
  const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || 'Unknown Artist';

  return (
    <div
      className="flex items-center p-3 hover:bg-white/5 rounded-xl cursor-pointer group transition-colors"
      onClick={() => playTrack(track, queue)}
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
        <ImageWithFallback src={thumbnail} alt={track.name} fill sizes="48px" className="object-cover" />
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex gap-0.5 items-end h-3">
              <div className="w-1 bg-[#FA243C] animate-[bounce_1s_infinite_0ms]" />
              <div className="w-1 bg-[#FA243C] animate-[bounce_1s_infinite_200ms]" />
              <div className="w-1 bg-[#FA243C] animate-[bounce_1s_infinite_400ms]" />
            </div>
          </div>
        )}
      </div>
      <div className="ml-4 flex-1 min-w-0">
        <MarqueeText text={track.name} className={`font-semibold ${isCurrent ? 'text-[#FA243C]' : 'text-white'}`} />
        <MarqueeText text={artistName} className="text-sm text-gray-400 mt-0.5" />
      </div>
      <button 
        className="p-2 text-white/50 hover:text-white transition-colors shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          setTrackMenu({
            track,
            onRemove: onRemove ? () => onRemove(track) : undefined,
            onDownload: onDownload ? () => onDownload(track) : undefined
          });
        }}
      >
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
  );
}
