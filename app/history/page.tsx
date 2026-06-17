'use client';

import { ArrowLeft, Search, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/lib/store';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { getHighResImage } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { MarqueeText } from '@/components/MarqueeText';
import { DesktopSearch } from '@/components/DesktopSearch';

export default function HistoryPage() {
  const router = useRouter();
  const history = usePlayerStore((state) => state.history);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const groups = useMemo(() => {

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const newGroups = { today: [] as any[], week: [] as any[], older: [] as any[] };
    
    history.forEach(item => {
      const date = new Date(item.playedAt);
      if (date >= today) newGroups.today.push(item);
      else if (date >= startOfWeek) newGroups.week.push(item);
      else newGroups.older.push(item);
    });

    return newGroups;
  }, [history]);


  const renderTrackItem = (item: any) => {
    const track = item.track;
    const artistName = Array.isArray(track.artist) ? track.artist.map((a: any) => a.name).join(', ') : track.artist?.name || 'Unknown Artist';

    const thumbnail = getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 100);

    const formatDuration = (seconds?: number) => {
      if (!seconds) return '';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return ` • ${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <div 
        key={item.playedAt + track.videoId} 
        className="flex items-center gap-4 py-2 cursor-pointer hover:bg-white/5 px-4 rounded-xl transition-colors"
        onClick={() => playTrack(track, history.map(h => h.track))}
      >
        <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0">
          <ImageWithFallback src={thumbnail} alt={track.name} fill sizes="56px" className="object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <MarqueeText text={track.name} className="text-white font-medium text-base" />
          <MarqueeText 
            text={`${artistName}${formatDuration(track.duration)}`} 
            className="text-white/60 text-sm" 
          />
        </div>
        <button className="p-2 text-white/60 hover:text-white transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen pb-24">

      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md pt-6 pb-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Riwayat</h1>
        </div>
        <DesktopSearch />
        <div className="w-10" />
      </div>

      <div className="px-4 mb-6">
        <button className="px-5 py-2 bg-white/10 text-white rounded-full text-sm font-medium border border-white/5">
          Lokal
        </button>
      </div>

      <div className="space-y-8">
        {groups.today.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white px-4 mb-4">Hari ini</h2>
            <div className="space-y-1">
              {groups.today.map(renderTrackItem)}
            </div>
          </div>
        )}

        {groups.week.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white px-4 mb-4">Minggu ini</h2>
            <div className="space-y-1">
              {groups.week.map(renderTrackItem)}
            </div>
          </div>
        )}

        {groups.older.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white px-4 mb-4">Lebih lama</h2>
            <div className="space-y-1">
              {groups.older.map(renderTrackItem)}
            </div>
          </div>
        )}


        {history.length === 0 && (
          <div className="text-center text-white/50 mt-20">
            Belum ada riwayat putaran
          </div>
        )}
      </div>
    </main>
  );
}
