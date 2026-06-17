'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { usePlayerStore, Track } from '@/lib/store';
import { Play, ArrowLeft, MoreHorizontal, Radio, Music, Trash2, BookmarkPlus, BookmarkCheck, Download, Search, Check } from 'lucide-react';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { getHighResImage } from '@/lib/utils';
import { TrackItem } from '@/components/TrackItem';
import { PlaylistSkeleton } from '@/components/PlaylistSkeleton';
import { MarqueeText } from '@/components/MarqueeText';
import { motion, AnimatePresence } from 'motion/react';

interface Playlist {
  id: string;
  name: string;
  img: string;
  tracks: Track[];
}

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingTrackName, setDownloadingTrackName] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const playTrack = usePlayerStore((state) => state.playTrack);
  const showToast = usePlayerStore((state) => state.showToast);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadPlaylist = async () => {
      if (!params.id) return;
      try {
        const id = String(params.id);
        const data = await db.getPlaylist(id);
        if (data) {
          setPlaylist(data as Playlist);
          setIsSaved(true);
        } else {
          // Try fetching from YouTube Music API
          const res = await fetch(`/api/ytplaylist?id=${id}`);
          if (res.ok) {
            const ytData = await res.json();
            setPlaylist({
              id: ytData.playlistId || ytData.id || id,
              name: ytData.name || ytData.title || 'Playlist',
              img: ytData.thumbnails?.[ytData.thumbnails.length - 1]?.url || '',
              tracks: ytData.videos || ytData.songs || []
            });
            setIsSaved(false);
          }
        }
      } catch (error) {
        console.error('Failed to load playlist:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylist();
  }, [params.id]);

  if (loading) {
    return <PlaylistSkeleton />;
  }

  if (!playlist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <p className="mb-4">Playlist tidak ditemukan</p>
        <button onClick={() => router.back()} className="text-[#FA243C]">Kembali</button>
      </div>
    );
  }

  const filteredTracks = playlist?.tracks.filter(track => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = track.name.toLowerCase().includes(query);
    const artistName = Array.isArray(track.artist)
      ? track.artist.map(a => a.name).join(', ')
      : track.artist?.name || '';
    const artistMatch = artistName.toLowerCase().includes(query);
    return nameMatch || artistMatch;
  }) || [];

  const handlePlayAll = () => {
    const tracksToPlay = filteredTracks.length > 0 ? filteredTracks : playlist.tracks;
    if (tracksToPlay.length > 0) {
      playTrack(tracksToPlay[0], tracksToPlay, 'playlist');
    }
  };

  const handleRadio = () => {
    const tracksToPlay = filteredTracks.length > 0 ? filteredTracks : playlist.tracks;
    if (tracksToPlay.length > 0) {
      playTrack(tracksToPlay[0], [], 'similar');
    }
  };

  const handleDeletePlaylist = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus playlist ini?')) {
      await db.deletePlaylist(playlist.id);
      router.back();
    }
  };

  const handleDownload = async (track: Track) => {
    // Check if it's an uploaded track to get the blob
    const uploadedSongs = await db.getUploadedSongs();
    const uploaded = uploadedSongs.find(s => s.videoId === track.videoId);
    
    if (uploaded?.audioBlob) {
      const url = URL.createObjectURL(uploaded.audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Berhasil diunduh');
    } else {
      // Stream from YouTube/YTMusic via server-side downloader API with progress tracking
      setDownloadingTrackName(track.name);
      setDownloadProgress(0);
      setIsSuccess(false);
      setShowDownloadProgress(true);

      const url = `/api/download?id=${track.videoId}&name=${encodeURIComponent(track.name)}`;
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setDownloadProgress(percentage);
        } else {
          setDownloadProgress(-1); // Indeterminate spinner state
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setIsSuccess(true);
          setDownloadProgress(100);

          const downloadBlob = xhr.response;
          const downloadUrl = URL.createObjectURL(downloadBlob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `${track.name}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
          showToast('Berhasil diunduh');
        } else {
          showToast('Gagal mengunduh lagu', 'error');
          setShowDownloadProgress(false);
        }
      };

      xhr.onerror = () => {
        showToast('Gagal mengunduh lagu', 'error');
        setShowDownloadProgress(false);
      };

      xhr.send();
    }
  };

  const handleRemoveSong = async (trackToRemove: Track) => {
    if (confirm('Hapus lagu ini dari playlist?')) {
      const updatedTracks = playlist.tracks.filter(t => t.videoId !== trackToRemove.videoId);
      const updatedPlaylist = { ...playlist, tracks: updatedTracks };
      await db.addPlaylist(updatedPlaylist);
      setPlaylist(updatedPlaylist);
    }
  };

  const handleSavePlaylist = async () => {
    if (isSaved) {
      if (confirm('Apakah Anda yakin ingin menghapus playlist ini dari koleksi?')) {
        await db.deletePlaylist(playlist.id);
        setIsSaved(false);
      }
    } else {
      await db.addPlaylist(playlist);
      setIsSaved(true);
    }
  };

  const isSelfCreated = /^\d+$/.test(playlist.id);

  return (
    <main className="min-h-screen pb-20">
      <div className={`sticky top-0 z-20 transition-all duration-300 px-4 py-4 flex items-center justify-between ${
        isScrolled ? 'bg-black/45 backdrop-blur-md' : 'bg-transparent'
      }`}>
        {isSearching ? (
          <div className="flex items-center gap-3 w-full animate-in fade-in duration-200">
            <button 
              onClick={() => {
                setIsSearching(false);
                setSearchQuery('');
              }}
              className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari lagu di playlist..."
              className="flex-1 bg-white/10 border border-white/5 rounded-full py-2 px-5 text-white text-sm focus:outline-none focus:border-[#FA243C]/50 transition-all"
              autoFocus
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button 
                onClick={() => router.back()} 
                className="text-white hover:bg-white/10 p-2 rounded-full transition-colors shrink-0"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              {isScrolled && (
                <h1 className="text-lg font-bold text-white uppercase tracking-wider truncate animate-in fade-in duration-200">
                  {playlist.name}
                </h1>
              )}
            </div>
            <button 
              onClick={() => setIsSearching(true)}
              className="text-white hover:bg-white/10 p-2 rounded-full transition-colors shrink-0"
              title="Cari lagu"
            >
              <Search className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      <div className="px-4 pt-4 pb-8 flex flex-col items-center text-center">
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl mb-6 relative bg-white/5 flex items-center justify-center">
          {playlist.img ? (
            <ImageWithFallback src={getHighResImage(playlist.img, 800)} alt={playlist.name} fill sizes="(max-width: 640px) 100vw, 300px" className="object-cover" />
          ) : (
            <Music className="w-20 h-20 text-white/20" />
          )}
        </div>
        <div className="w-full max-w-sm mb-2">
          <MarqueeText text={playlist.name} className="text-2xl sm:text-3xl font-bold text-white text-center" />
        </div>
        <p className="text-white/50 mb-6">{playlist.tracks.length} lagu</p>

        <div className="flex items-center gap-4 w-full justify-center">
          <button 
            onClick={handlePlayAll}
            disabled={playlist.tracks.length === 0}
            className="w-14 h-14 bg-[#81B29A] rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
          >
            <Play className="w-7 h-7 text-black fill-current ml-1" />
          </button>
          <button 
            onClick={handleRadio}
            disabled={playlist.tracks.length === 0}
            className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <Radio className="w-6 h-6 text-white" />
          </button>
          {!isSelfCreated && (
            <button 
              onClick={handleSavePlaylist}
              className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              title={isSaved ? "Hapus dari Koleksi" : "Simpan ke Koleksi"}
            >
              {isSaved ? <BookmarkCheck className="w-6 h-6 text-[#81B29A]" /> : <BookmarkPlus className="w-6 h-6 text-white" />}
            </button>
          )}
          {isSelfCreated && isSaved && (
            <button 
              onClick={handleDeletePlaylist}
              className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-colors"
              title="Hapus Playlist"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 max-w-3xl mx-auto">
        {filteredTracks.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            {searchQuery ? 'Tidak ada lagu yang cocok dengan pencarian.' : 'Belum ada lagu di playlist ini.'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTracks.map((track, index) => (
              <TrackItem 
                key={`${track.videoId}-${index}`} 
                track={track} 
                queue={filteredTracks} 
                onRemove={isSelfCreated ? handleRemoveSong : undefined}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDownloadProgress && (
          <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: -100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-[#121214]/90 backdrop-blur-2xl w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden"
            >
              {/* Soft background glow */}
              <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-[60px] pointer-events-none transition-colors duration-500 ${
                isSuccess ? 'bg-[#10B981]/10' : 'bg-[#FA243C]/10'
              }`} />
              <div className={`absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-[60px] pointer-events-none transition-colors duration-500 ${
                isSuccess ? 'bg-[#10B981]/10' : 'bg-[#FA243C]/10'
              }`} />

              <span className={`text-[9px] font-black tracking-[0.25em] uppercase mb-4 block opacity-80 transition-colors duration-500 ${
                isSuccess ? 'text-[#10B981]' : 'text-[#FA243C]'
              }`}>
                Sistem Unduhan
              </span>

              <div className={`w-20 h-20 rounded-full border border-white/5 flex items-center justify-center mx-auto mb-6 relative transition-colors duration-500 ${
                isSuccess ? 'bg-[#10B981]/5' : 'bg-[#FA243C]/5'
              }`}>
                {isSuccess ? (
                  <>
                    {/* Pulsing ring 1 */}
                    <motion.div
                      className="absolute inset-0 rounded-full border border-[#10B981]/50"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                    {/* Pulsing ring 2 */}
                    <motion.div
                      className="absolute inset-0 rounded-full border border-[#10B981]/30"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 2.3, opacity: 0 }}
                      transition={{ duration: 1.0, ease: "easeOut", delay: 0.15 }}
                    />
                    {/* Glowing particles burst */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {[...Array(8)].map((_, i) => {
                        const angle = (i * 45) * (Math.PI / 180);
                        const distance = 52;
                        const x = Math.cos(angle) * distance;
                        const y = Math.sin(angle) * distance;
                        return (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 bg-[#10B981] rounded-full absolute shadow-[0_0_4px_#10B981]"
                            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                            animate={{ x, y, scale: 0, opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.05 }}
                          />
                        );
                      })}
                    </div>
                    
                    {/* Centered Checkmark with bounce */}
                    <motion.div
                      key="success-check"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 15
                      }}
                      className="text-[#10B981] flex items-center justify-center z-10"
                    >
                      <Check className="w-9 h-9" />
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    key="download-icon"
                    initial={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="text-white/80 flex items-center justify-center"
                  >
                    <Download className="w-8 h-8" />
                  </motion.div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                {isSuccess ? 'Unduhan Selesai' : 'Mengunduh Lagu'}
              </h3>
              <p className="text-white/60 text-sm mb-8 truncate max-w-xs mx-auto font-medium">
                {downloadingTrackName}
              </p>

              {!isSuccess && (
                <div className="space-y-4">
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                    <div 
                      className="bg-gradient-to-r from-[#FA243C] to-[#FF5E73] h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(250,36,60,0.6)]"
                      style={{ width: `${downloadProgress >= 0 ? downloadProgress : 5}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold px-1">
                    <span className="text-white/30 tracking-wider">STATUS</span>
                    <span className="text-[#FA243C] tracking-wide">
                      {downloadProgress >= 0 ? `${downloadProgress}%` : 'Connecting...'}
                    </span>
                  </div>
                </div>
              )}

              {isSuccess && (
                <motion.button 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                  onClick={() => {
                    setShowDownloadProgress(false);
                    setTimeout(() => {
                      setIsSuccess(false);
                    }, 300);
                  }}
                  className="w-full mt-2 py-4 bg-[#10B981] hover:bg-[#059669] text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(16,185,129,0.3)] text-sm tracking-wide"
                >
                  Tutup
                </motion.button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
