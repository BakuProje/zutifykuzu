'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, SubscribedArtist, SavedAlbum } from '@/lib/db';
import { Track } from '@/lib/store';
import { TrackItem } from '@/components/TrackItem';
import { Heart, Plus, ListMusic, Trash2, Play, MoreVertical, Download, TrendingUp, Clock, UploadCloud, Check, Pin } from 'lucide-react';
import Image from 'next/image';
import { usePlayerStore } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { MarqueeText } from '@/components/MarqueeText';
import { cn, getHighResImage } from '@/lib/utils';
import { ImageWithFallback } from '@/components/ImageWithFallback';

export default function Library() {
  const router = useRouter();
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [uploadedSongs, setUploadedSongs] = useState<(Track & { audioBlob?: Blob; uploadedAt: number })[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([]);
  const [subscribedArtists, setSubscribedArtists] = useState<SubscribedArtist[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('Daftar putar');

  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistImg, setNewPlaylistImg] = useState('');

  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState<any>({ name: '', artist: '', img: '' });

  const [isEditing, setIsEditing] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingTrackName, setDownloadingTrackName] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const playTrack = usePlayerStore((state) => state.playTrack);
  const showToast = usePlayerStore((state) => state.showToast);

  const tabs = ['Daftar putar', 'Lagu', 'Album', 'Artis', 'Diunggah'];

  const loadLibrary = async () => {
    const liked = await db.getLikedSongs();
    const pl = await db.getPlaylists();
    const sa = await db.getSubscribedArtists();
    const albums = await db.getSavedAlbums();
    const uploaded = await db.getUploadedSongs();

    setLikedSongs(liked);
    setPlaylists(pl);
    setSubscribedArtists(sa);
    setSavedAlbums(albums);
    setUploadedSongs(uploaded);

    // Load pinned playlist IDs
    const pinned = await db.getPinnedPlaylists();
    setPinnedIds(new Set(pinned.map(p => p.playlistId)));
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist = {
      id: Date.now().toString(),
      name: newPlaylistName,
      img: newPlaylistImg || 'https://picsum.photos/seed/playlist/200/200',
      tracks: [],
    };
    await db.addPlaylist(newPlaylist);
    setShowCreate(false);
    setNewPlaylistName('');
    setNewPlaylistImg('');
    loadLibrary();
  };

  const handleUploadMusic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set default name from filename
    const name = file.name.replace(/\.[^/.]+$/, "");
    setUploadData({ ...uploadData, name, file });
    setShowUpload(true);
    setIsEditing(false);
  };

  const saveUpload = async () => {
    if (!uploadData.file && !isEditing) return;

    const track: Track & { audioBlob?: Blob; uploadedAt: number } = {
      videoId: uploadData.videoId || `local-${Date.now()}`,
      name: uploadData.name,
      artist: { name: uploadData.artist || 'Unknown Artist' },
      thumbnails: [{ url: uploadData.img || 'https://picsum.photos/seed/music/200/200', width: 200, height: 200 }],
      audioBlob: uploadData.file,
      uploadedAt: Date.now(),
    };

    await db.addUploadedSong(track);
    setShowUpload(false);
    setUploadData({ name: '', artist: '', img: '' });
    loadLibrary();
    showToast('Berhasil diunggah');
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setIsImporting(true);
    try {
      const res = await fetch(`/api/import?url=${encodeURIComponent(importUrl.trim())}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengimpor lagu/playlist');
      }
      const data = await res.json();
      if (data.type === 'song') {
        await db.addLikedSong(data.track);
        showToast('Berhasil mengimpor lagu');
      } else if (data.type === 'playlist') {
        await db.addPlaylist({
          id: data.playlist.id,
          name: data.playlist.name,
          img: data.playlist.img,
          tracks: data.playlist.tracks,
        });
        showToast('Berhasil mengimpor playlist');
      }
      setShowImport(false);
      setImportUrl('');
      loadLibrary();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Terjadi kesalahan saat mengimpor', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownload = async (track: Track & { audioBlob?: Blob }) => {
    let blob = track.audioBlob;

    // If blob is missing, try to find it in uploaded songs
    if (!blob) {
      const uploadedSongs = await db.getUploadedSongs();
      const uploaded = uploadedSongs.find(s => s.videoId === track.videoId);
      if (uploaded) blob = uploaded.audioBlob;
    }

    // If we have a blob, do a real file download
    if (blob) {
      const url = URL.createObjectURL(blob);
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

  const handleRemoveLiked = async (track: Track) => {
    await db.removeLikedSong(track.videoId);
    loadLibrary();
  };

  const handleRemoveUploaded = async (track: Track) => {
    if (confirm('Hapus lagu yang diunggah ini?')) {
      await db.removeUploadedSong(track.videoId);
      loadLibrary();
    }
  };

  const handleEditUploaded = (track: any) => {
    setUploadData({
      videoId: track.videoId,
      name: track.name,
      artist: track.artist.name,
      img: track.thumbnails[0].url,
      file: track.audioBlob
    });
    setIsEditing(true);
    setShowUpload(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.main 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-screen pt-6 px-4 pb-24 bg-[#050505]"
    >
      <div className="flex overflow-x-auto no-scrollbar gap-3 mb-6 snap-x snap-mandatory scroll-smooth">
        {tabs.map((tab) => (
          <motion.button
            key={tab}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab)}
            className="relative whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-colors snap-center outline-none"
          >
            {activeTab === tab && (
              <motion.div
                layoutId="activeLibraryTab"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 bg-[#FA243C] rounded-full shadow-lg shadow-[#FA243C]/20"
              />
            )}
            <span className={cn(
              "relative z-10 transition-colors duration-300",
              activeTab === tab ? "text-white" : "text-white/60 hover:text-white"
            )}>
              {tab}
            </span>
          </motion.button>
        ))}
      </div>

      {activeTab === 'Daftar putar' && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => setActiveTab('Lagu')}>
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Disukai</h3>
              <p className="text-white/50 text-sm">{likedSongs.length} lagu</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => setActiveTab('Diunggah')}>
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Diunggah</h3>
              <p className="text-white/50 text-sm">{uploadedSongs.length} lagu</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors w-full text-left mt-4"
          >
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Buat playlist baru</h3>
            </div>
          </button>

          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors w-full text-left mt-1"
          >
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-[#FA243C]" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Impor dari Link</h3>
              <p className="text-white/50 text-xs text-left">YouTube Music Dan Spotify</p>
            </div>
          </button>

          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
              onClick={() => router.push(`/playlist/${pl.id}`)}
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <ImageWithFallback src={pl.img} alt={pl.name} fill sizes="144px" className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pl.tracks.length > 0) playTrack(pl.tracks[0], pl.tracks, 'playlist');
                    }}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Play className="w-4 h-4 text-white ml-0.5 fill-current" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <MarqueeText text={pl.name} className="text-white font-medium" />
                <p className="text-white/50 text-sm">{pl.tracks.length} lagu</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const isPinned = pinnedIds.has(pl.id);
                    if (isPinned) {
                      db.removePinnedPlaylist(pl.id).then(() => {
                        const newSet = new Set(pinnedIds);
                        newSet.delete(pl.id);
                        setPinnedIds(newSet);
                        showToast('Playlist dicopot dari Beranda');
                      });
                    } else {
                      db.addPinnedPlaylist(pl.id).then(() => {
                        const newSet = new Set(pinnedIds);
                        newSet.add(pl.id);
                        setPinnedIds(newSet);
                        showToast('Playlist disematkan di Beranda');
                      });
                    }
                  }}
                  className={`p-2 transition-all ${
                    pinnedIds.has(pl.id) 
                      ? 'text-[#FA243C] hover:text-[#FA243C]/70' 
                      : 'text-white/30 hover:text-white/60'
                  }`}
                  title={pinnedIds.has(pl.id) ? 'Copot dari Beranda' : 'Sematkan di Beranda'}
                >
                  <Pin className={`w-4 h-4 ${pinnedIds.has(pl.id) ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    db.deletePlaylist(pl.id).then(loadLibrary);
                  }}
                  className="p-2 text-white/50 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Lagu' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Lagu Disukai</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#FA243C] hover:bg-[#D81E33] rounded-full text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Impor Lagu</span>
              </button>
              <button
                onClick={() => likedSongs.length > 0 && playTrack(likedSongs[0], likedSongs, 'playlist')}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {likedSongs.map((track) => (
              <TrackItem
                key={track.videoId}
                track={track}
                queue={likedSongs}
                onRemove={handleRemoveLiked}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Diunggah' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Lagu Diunggah</h2>
            <label className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer">
              <Plus className="w-5 h-5" />
              <input type="file" accept="audio/*" className="hidden" onChange={handleUploadMusic} />
            </label>
          </div>
          <div className="space-y-1">
            {uploadedSongs.map((track) => (
              <TrackItem
                key={track.videoId}
                track={track}
                queue={uploadedSongs}
                onRemove={handleRemoveUploaded}
                onDownload={handleDownload}
              />
            ))}
            {uploadedSongs.length === 0 && (
              <div className="text-center text-white/30 py-20">
                <UploadCloud className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Belum ada lagu yang diunggah.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Album' && (
        <div className="grid grid-cols-2 gap-4">
          {savedAlbums.map(album => (
            <div key={album.albumId} className="space-y-2" onClick={() => router.push(`/album/${album.albumId}`)}>
              <div className="aspect-square relative rounded-xl overflow-hidden shadow-lg">
                <ImageWithFallback src={getHighResImage(album.thumbnails[0].url, 400)} alt={album.name} fill className="object-cover" />
              </div>
              <MarqueeText text={album.name} className="text-white text-sm font-medium" />
              <p className="text-white/40 text-xs truncate">{album.artist}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Artis' && (
        <div className="grid grid-cols-2 gap-4">
          {subscribedArtists.map(artist => (
            <div key={artist.artistId} className="flex flex-col items-center space-y-3" onClick={() => router.push(`/artist/${artist.artistId}`)}>
              <div className="w-32 h-32 relative rounded-full overflow-hidden shadow-lg">
                <ImageWithFallback src={getHighResImage(artist.thumbnails[0].url, 300)} alt={artist.name} fill className="object-cover" />
              </div>
              <MarqueeText text={artist.name} className="text-white text-sm font-medium" />
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1C1C1E] w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl"
          >
            <h2 className="text-2xl font-black text-white mb-8">
              {isEditing ? 'Edit Informasi' : 'Lengkapi Informasi'}
            </h2>

            <div className="flex flex-col items-center gap-6 mb-8">
              <label className="relative w-40 h-40 rounded-3xl overflow-hidden cursor-pointer group bg-white/5 border-2 border-dashed border-white/10 hover:border-[#FA243C]/50 transition-all">
                {uploadData.img ? (
                  <ImageWithFallback src={uploadData.img} alt="Cover" fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
                    <UploadCloud className="w-8 h-8 mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Pilih Cover</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (val) => setUploadData({ ...uploadData, img: val }))} />
              </label>

              <div className="w-full space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Nama Lagu</span>
                  <input
                    type="text"
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                    placeholder="Judul lagu..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-[#FA243C]/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Artis</span>
                  <input
                    type="text"
                    value={uploadData.artist}
                    onChange={(e) => setUploadData({ ...uploadData, artist: e.target.value })}
                    placeholder="Nama penyanyi..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-[#FA243C]/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowUpload(false)}
                className="py-4 rounded-2xl font-bold text-white/50 hover:bg-white/5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={saveUpload}
                disabled={!uploadData.name}
                className="py-4 rounded-2xl font-bold bg-[#FA243C] text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-[0_10px_20px_rgba(250,36,60,0.3)]"
              >
                {isEditing ? 'Simpan' : 'Unggah'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#1C1C1E] rounded-3xl p-8 w-full max-w-sm border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Buat Playlist</h2>
            <div className="space-y-6">
              <label className="w-32 h-32 mx-auto rounded-2xl overflow-hidden bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer">
                {newPlaylistImg ? <ImageWithFallback src={newPlaylistImg} alt="Preview" fill className="object-cover" /> : <Plus className="w-8 h-8 text-white/20" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setNewPlaylistImg)} />
              </label>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nama playlist"
                className="w-full bg-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-4 text-white/50 font-bold">Batal</button>
                <button onClick={handleCreatePlaylist} className="flex-1 py-4 bg-white text-black rounded-2xl font-bold">Buat</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1C1C1E] w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl"
          >
            <h2 className="text-2xl font-black text-white mb-6">
              Impor dari Link
            </h2>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Tempel link lagu/playlist dari <b>YouTube Music</b>, <b>YouTube</b>, atau link lagu dari <b>Spotify</b> untuk diimpor ke Pustaka Anda.
            </p>

            <div className="space-y-4 mb-8">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Link URL</span>
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://music.youtube.com/... atau https://open.spotify.com/track/..."
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-[#FA243C]/50 transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportUrl('');
                }}
                disabled={isImporting}
                className="py-4 rounded-2xl font-bold text-white/50 hover:bg-white/5 transition-all disabled:opacity-30"
              >
                Batal
              </button>
              <button
                onClick={handleImport}
                disabled={!importUrl.trim() || isImporting}
                className="py-4 rounded-2xl font-bold bg-[#FA243C] text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-[0_10px_20px_rgba(250,36,60,0.3)] flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengimpor...</span>
                  </>
                ) : (
                  <span>Impor</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
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
    </motion.main>
  );
}
