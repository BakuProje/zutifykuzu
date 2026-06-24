'use client';

import { usePlayerStore } from '@/lib/store';
import { Share2, PlusCircle, MinusCircle, Download } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { getBestThumbnail } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';

export function TrackMenuBottomSheet() {
  const trackMenu = usePlayerStore((state) => state.trackMenu);
  const setTrackMenu = usePlayerStore((state) => state.setTrackMenu);
  const setTrackToAdd = usePlayerStore((state) => state.setTrackToAdd);
  const showToast = usePlayerStore((state) => state.showToast);

  const isOpen = trackMenu !== null;

  // Disable body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const track = trackMenu?.track;
  const onRemove = trackMenu?.onRemove;
  const onDownload = trackMenu?.onDownload;

  if (!track) {
    return (
      <AnimatePresence>
        {/* Render nothing but keep AnimatePresence happy */}
      </AnimatePresence>
    );
  }

  const thumbnail = getBestThumbnail(track.thumbnails, 200, track.videoId);
  const artistName = Array.isArray(track.artist)
    ? track.artist.map((a) => a.name).join(', ')
    : track.artist?.name || 'Unknown Artist';

  const handleShare = async () => {
    try {
      const shareUrl = `https://music.youtube.com/watch?v=${track.videoId}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast('Tautan berhasil disalin');
    } catch (err) {
      showToast('Gagal menyalin tautan', 'error');
    }
    setTrackMenu(null);
  };

  const handleAddToPlaylist = () => {
    setTrackToAdd(track);
    setTrackMenu(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTrackMenu(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Bottom Sheet Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="relative w-full bg-[#18181A]/95 backdrop-blur-md border-t border-white/10 rounded-t-[2.5rem] px-6 pb-10 flex flex-col z-10 max-h-[85vh] overflow-y-auto no-scrollbar"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-4 shrink-0" />

            {/* Song Header */}
            <div className="flex items-center gap-4 py-2 shrink-0">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white/5 shadow-md">
                <ImageWithFallback src={thumbnail} alt={track.name} fill sizes="56px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-base truncate">{track.name}</h3>
                <p className="text-sm text-white/50 mt-0.5 truncate">{artistName}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-white/10 my-4 shrink-0" />

            {/* Menu Items */}
            <div className="space-y-1">
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-4 py-3.5 px-2 hover:bg-white/5 rounded-2xl transition-colors text-left text-white group"
              >
                <Share2 className="w-6 h-6 text-white/75 group-hover:text-white transition-colors" />
                <span className="font-medium text-base">Bagikan</span>
              </button>

              <button
                onClick={handleAddToPlaylist}
                className="w-full flex items-center gap-4 py-3.5 px-2 hover:bg-white/5 rounded-2xl transition-colors text-left text-white group"
              >
                <PlusCircle className="w-6 h-6 text-white/75 group-hover:text-white transition-colors" />
                <span className="font-medium text-base">Tambahkan ke playlist</span>
              </button>

              {onRemove && (
                <button
                  onClick={() => {
                    onRemove();
                    setTrackMenu(null);
                  }}
                  className="w-full flex items-center gap-4 py-3.5 px-2 hover:bg-white/5 rounded-2xl transition-colors text-left text-white group"
                >
                  <MinusCircle className="w-6 h-6 text-white/75 group-hover:text-white transition-colors" />
                  <span className="font-medium text-base">Hapus dari playlist ini</span>
                </button>
              )}

              {onDownload && (
                <button
                  onClick={() => {
                    onDownload();
                    setTrackMenu(null);
                  }}
                  className="w-full flex items-center gap-4 py-3.5 px-2 hover:bg-white/5 rounded-2xl transition-colors text-left text-white group"
                >
                  <Download className="w-6 h-6 text-white/75 group-hover:text-white transition-colors" />
                  <span className="font-medium text-base">Unduh Lagu</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
