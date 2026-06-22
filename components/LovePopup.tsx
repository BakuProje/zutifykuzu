'use client';

import { useState, useEffect, useCallback } from 'react';
import { Track, usePlayerStore } from '@/lib/store';
import { db } from '@/lib/db';
import { X, Heart, ListMusic, Plus, CheckCircle2, Music, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from './ImageWithFallback';
import { MarqueeText } from './MarqueeText';
import { getHighResImage } from '@/lib/utils';

interface Playlist {
  id: string;
  name: string;
  img: string;
  tracks: any[];
}

interface LovePopupProps {
  track: Track | null;
  onClose: () => void;
}

export function LovePopup({ track, onClose }: LovePopupProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const showToast = usePlayerStore((state) => state.showToast);

  const showSuccessState = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1200);
  }, [onClose]);

  useEffect(() => {
    if (track) {
      db.isLiked(track.videoId).then(setIsLiked);
      db.getPlaylists().then((data) => setPlaylists(data as Playlist[]));
    }
  }, [track]);

  const handleToggleLike = async () => {
    if (!track) return;
    try {
      if (isLiked) {
        await db.removeLikedSong(track.videoId);
        setIsLiked(false);
        showSuccessState('Dihapus dari Disukai');
      } else {
        await db.addLikedSong(track);
        setIsLiked(true);
        showSuccessState('Ditambahkan ke Disukai');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal mengubah status suka', 'error');
    }
  };

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!track) return;
    if (playlist.tracks.some(t => t.videoId === track.videoId)) {
      showSuccessState(`Sudah ada di ${playlist.name}`);
      return;
    }
    const updatedPlaylist = {
      ...playlist,
      tracks: [...playlist.tracks, track]
    };
    await db.addPlaylist(updatedPlaylist);
    showSuccessState(`Ditambahkan ke ${playlist.name}`);
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim() || !track) return;
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      img: getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 400),
      tracks: [track]
    };
    await db.addPlaylist(newPlaylist);
    setNewPlaylistName('');
    setIsCreating(false);
    showSuccessState(`Playlist "${newPlaylistName}" dibuat`);
  };

  const handleBack = () => {
    if (isCreating) {
      setIsCreating(false);
    } else {
      setShowPlaylists(false);
    }
  };

  if (!track) return null;

  const thumbnail = getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 200);
  const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || 'Unknown';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Popup */}
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full sm:w-[400px] max-h-[80vh] bg-[#1A1A1C]/95 backdrop-blur-xl rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 shadow-[0_-10px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-3">
            <h2 className="text-lg font-black text-white tracking-tight">Simpan Lagu</h2>
            <button
              onClick={showPlaylists ? handleBack : onClose}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              {showPlaylists ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>

          {/* Track Info */}
          <AnimatePresence initial={false}>
            {!showPlaylists && !showSuccess && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-lg ring-1 ring-white/10">
                    <ImageWithFallback src={thumbnail} alt={track.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <MarqueeText text={track.name} className="text-white font-bold text-base" />
                    <MarqueeText text={artistName} className="text-white/50 text-sm" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="px-3 pb-6">
            {showSuccess ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-10"
              >
                <div className="w-16 h-16 bg-[#FA243C]/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#FA243C]" />
                </div>
                <h3 className="text-lg font-bold text-white text-center">{successMessage}</h3>
              </motion.div>
            ) : showPlaylists ? (
              /* Playlist selection view */
              <div className="space-y-1">
                {isCreating ? (
                  <div className="p-4 space-y-4">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Nama playlist baru..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FA243C]/50 transition-colors"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAdd(); }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsCreating(false)}
                        className="flex-1 py-3 rounded-xl font-medium text-white/60 hover:bg-white/5 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleCreateAndAdd}
                        disabled={!newPlaylistName.trim()}
                        className="flex-1 py-3 bg-[#FA243C] text-white rounded-xl font-bold disabled:opacity-40 transition-all hover:bg-[#D81E33]"
                      >
                        Buat & Tambah
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setIsCreating(true)}
                      className="w-full flex items-center gap-4 p-3.5 hover:bg-white/5 rounded-xl transition-colors text-left group"
                    >
                      <div className="w-11 h-11 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-[#FA243C]/20 transition-colors">
                        <Plus className="w-5 h-5 text-[#FA243C]" />
                      </div>
                      <span className="text-white font-semibold">Buat Playlist Baru</span>
                    </button>

                    <div className="my-1 border-t border-white/5" />

                    <div className="max-h-[40vh] overflow-y-auto no-scrollbar">
                      {playlists.length === 0 ? (
                        <div className="text-center py-10 text-white/30">
                          <ListMusic className="w-10 h-10 mx-auto mb-3 opacity-40" />
                          <p className="text-sm font-medium">Belum ada playlist</p>
                          <p className="text-xs text-white/20 mt-1">Buat playlist baru untuk memulai</p>
                        </div>
                      ) : (
                        playlists.map((playlist) => (
                          <button
                            key={playlist.id}
                            onClick={() => handleAddToPlaylist(playlist)}
                            className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                          >
                            <div className="relative w-11 h-11 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                              {playlist.img ? (
                                <ImageWithFallback src={playlist.img} alt={playlist.name} fill className="object-cover" />
                              ) : (
                                <Music className="w-5 h-5 text-white/30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <MarqueeText text={playlist.name} className="text-white font-medium text-sm" />
                              <div className="text-white/40 text-xs">{playlist.tracks.length} lagu</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Main options view */
              <div className="space-y-1.5">
                {/* Disukai option */}
                <button
                  onClick={handleToggleLike}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-left group active:scale-[0.98]"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isLiked 
                      ? 'bg-[#FA243C]/15 ring-1 ring-[#FA243C]/30' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  }`}>
                    <Heart className={`w-6 h-6 transition-all ${
                      isLiked ? 'fill-[#FA243C] text-[#FA243C]' : 'text-white/70'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-bold text-[15px]">
                      {isLiked ? 'Hapus dari Disukai' : 'Tambahkan ke Disukai'}
                    </span>
                    <p className="text-white/40 text-xs mt-0.5">Simpan ke koleksi lagu favoritmu</p>
                  </div>
                </button>

                {/* Masukkan ke Playlist option */}
                <button
                  onClick={() => setShowPlaylists(true)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-left group active:scale-[0.98]"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all">
                    <ListMusic className="w-6 h-6 text-white/70" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-bold text-[15px]">Masukkan ke Playlist</span>
                    <p className="text-white/40 text-xs mt-0.5">
                      {playlists.length > 0 
                        ? `${playlists.length} playlist tersedia` 
                        : 'Buat playlist baru untuk memulai'
                      }
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
