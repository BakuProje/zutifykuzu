'use client';

import { useEffect, useState, useRef } from 'react';
import { Track, usePlayerStore } from '@/lib/store';
import { Loader2, History, Cast, User, Play, MoreVertical } from 'lucide-react';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { MixedScroll } from '@/components/MixedScroll';
import { CommunityPlaylistCard } from '@/components/CommunityPlaylistCard';
import { MarqueeText } from '@/components/MarqueeText';
import { getHighResImage, getBestThumbnail } from '@/lib/utils';
import { motion } from 'motion/react';
import Link from 'next/link';

import { HomeSkeleton } from '@/components/HomeSkeleton';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';
import { DesktopSearch } from '@/components/DesktopSearch';

const pills = ['Chill', 'Focus', 'Commute', 'Gaming', 'Energize', 'Party', 'Feel good', 'Romance', 'Workout', 'Sleep', 'Sad', 'Happy', 'Nostalgia', 'Acoustic', 'Pop', 'Rock'];

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function Home() {
  const homeData = usePlayerStore((state) => state.homeData);
  const setHomeData = usePlayerStore((state) => state.setHomeData);

  const [heroTracks, setHeroTracks] = useState<Track[]>(homeData?.heroTracks || []);
  const [speedDialTracks, setSpeedDialTracks] = useState<Track[]>(homeData?.speedDialTracks || []);
  const [quickPicksTracks, setQuickPicksTracks] = useState<Track[]>(homeData?.quickPicksTracks || []);
  const [communityPlaylists, setCommunityPlaylists] = useState<any[]>(homeData?.communityPlaylists || []);
  const [artists, setArtists] = useState<any[]>(homeData?.artists || []);
  const [categories, setCategories] = useState<{ key: string; title: string; type: 'song' | 'mixed'; items: any[] }[]>(homeData?.categories || []);
  const [loading, setLoading] = useState(!homeData);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filterData, setFilterData] = useState<{ title: string; tracks: Track[] }[]>([]);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const hasMounted = useHasMounted();
  const playTrack = usePlayerStore((state) => state.playTrack);
  const history = usePlayerStore((state) => state.history);
  
  const dragFilters = useDraggableScroll<HTMLDivElement>({ autoScroll: false });
  const dragHero = useDraggableScroll<HTMLDivElement>({ autoScroll: true, autoScrollInterval: 4000 });
  const dragSpeedDial = useDraggableScroll<HTMLDivElement>({ autoScroll: true, autoScrollInterval: 3500 });
  const dragQuickPicks = useDraggableScroll<HTMLDivElement>({ autoScroll: true, autoScrollInterval: 4500 });
  const dragCommunity = useDraggableScroll<HTMLDivElement>({ autoScroll: true, autoScrollInterval: 4000 });
  const dragArtists = useDraggableScroll<HTMLDivElement>({ autoScroll: true, autoScrollInterval: 3500 });

  useEffect(() => {
    if (!activeFilter) return;
    const fetchFilterData = async () => {
      setLoadingFilter(true);
      try {
        const queries = [
          { title: `Feeling ${activeFilter.toLowerCase()}`, q: `${activeFilter} mood songs` },
          { title: `${activeFilter} hits`, q: `top ${activeFilter} songs` },
          { title: `More like ${activeFilter}`, q: `best ${activeFilter} tracks` },
        ];
        
        const results = [];
        for (const { title, q } of queries) {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=song`);
          const data = await res.json();
          results.push({ title, tracks: data.slice(0, 10) });
        }
        
        setFilterData(results);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingFilter(false);
      }
    };
    fetchFilterData();
  }, [activeFilter]);

  const fetchHomeData = async () => {
    if (homeData && homeData.version === '1.8' && Date.now() - homeData.timestamp < 1000 * 60 * 60) {
      setHeroTracks(shuffleArray(homeData.heroTracks || []));
      setSpeedDialTracks(homeData.speedDialTracks || []);
      setQuickPicksTracks(homeData.quickPicksTracks || []);
      setCommunityPlaylists(homeData.communityPlaylists || []);
      setArtists(homeData.artists || []);
      setCategories(homeData.categories || []);
      setLoading(false);
      return;
    }
    
    try {
      // Define all queries
      const mainQueries: { key: string; title?: string; q: string; type?: string }[] = [
        { key: 'speedDial', q: 'top trending hits 2025', type: 'song' },
        { key: 'quickPicks', q: 'chill lofi hip hop', type: 'all' },
        { key: 'community', q: 'best chill playlists', type: 'playlist' },
      ];

      const catQueries = [
        { key: 'cat0', title: 'Trending Now', q: 'lagu indonesia hits terbaru', type: 'song' },
        { key: 'cat1', title: 'New Releases', q: 'lagu pop indonesia rilis terbaru', type: 'song' },
        { key: 'similar0', title: 'Serupa dengan Ryuuuchiee', q: 'Ryuuuchiee', type: 'all' },
        { key: 'similar1', title: 'Serupa dengan Tems', q: 'Tems', type: 'all' },
        { key: 'cat2', title: 'Viral on TikTok', q: 'lagu viral tiktok hits', type: 'song' },
        { key: 'cat3', title: 'Feel-good rock', q: 'rock indonesia hits', type: 'song' },
        { key: 'cat4', title: 'Acoustic Chill', q: 'lagu akustik cafe santai', type: 'song' },
        { key: 'cat5', title: 'Lagu Galau Terpopuler', q: 'lagu galau sedih indonesia terbaru', type: 'song' },
        { key: 'cat6', title: 'K-Pop Essentials', q: 'kpop hits essentials', type: 'song' },
        { key: 'cat7', title: 'Nostalgia Indonesia', q: 'hits nostalgia indonesia 2000an', type: 'song' },
        { key: 'cat8', title: 'Top Global Hits', q: 'top global Billboard hits 2025', type: 'song' },
        { key: 'cat9', title: 'Indie Indonesia', q: 'indie indonesia populer', type: 'song' },
        { key: 'cat10', title: 'EDM & Dance', q: 'edm dance hits', type: 'song' },
        { key: 'cat11', title: 'Hip-Hop & R&B', q: 'hip hop r&b hits', type: 'song' },
        { key: 'cat12', title: 'Lofi Study Beats', q: 'lofi study beats chill lofi', type: 'song' },
      ];

      const allQueries = [...mainQueries, ...catQueries];
      
      let currentCats: { key: string; title: string; type: 'song' | 'mixed'; items: any[] }[] = [];
      let currentHeroTracks: Track[] = [];
      let currentSpeedDialTracks: Track[] = [];
      let currentQuickPicksTracks: Track[] = [];
      let currentCommunityPlaylists: any[] = [
        { playlistId: 'PLPFzKsPt50V8azAzY0Sg2go23AL9nuAAF' }, // songs to vibe to
        { playlistId: 'PLyBxKXnR4L89zxuxXdrXdWvphJkctdPdi' }, // Top 50 Lagu Indie Indonesia
        { playlistId: 'PLo3pNg0eiPc_JHZ-1jjCYbup7_rT3CBl8' }, // Late Night Songs Playlist
        { playlistId: 'PL3EfCK9aCbkptFjtgWYJ8wiXgJQw5k3M3' }, // Best of Chill Nation
        { playlistId: 'PLyORnIW1xT6z8za6mAQhjjzr_EQTq8qcY' }  // Best Indie Songs of 2026
      ];
      let currentArtists: any[] = [];
      
      const orderMap = new Map(catQueries.map((c, i) => [c.key, i]));
      
      // Helper function to remove duplicates based on videoId
      const removeDuplicates = (tracks: any[]) => {
        const seen = new Set<string>();
        return tracks.filter(track => {
          if (seen.has(track.videoId)) return false;
          seen.add(track.videoId);
          return true;
        });
      };

      // Helper function to get all used videoIds across all sections
      const getAllUsedVideoIds = () => {
        const used = new Set<string>();
        currentHeroTracks.forEach(t => used.add(t.videoId));
        currentSpeedDialTracks.forEach(t => used.add(t.videoId));
        currentQuickPicksTracks.forEach(t => used.add(t.videoId));
        currentCats.forEach(cat => cat.items.forEach(t => used.add(t.videoId)));
        return used;
      };

      // Helper function to filter out already used tracks
      const filterUsedTracks = (tracks: any[]) => {
        const usedIds = getAllUsedVideoIds();
        return tracks.filter(track => !usedIds.has(track.videoId));
      };

      // Helper function to filter out long compilation/playlist videos (greater than 6 minutes)
      const filterShortTracks = (tracks: any[]) => {
        return tracks.filter(track => {
          if (track.duration && track.duration > 360) return false;
          return true;
        });
      };

      const processResult = (key: string, title: string | undefined, data: any[]) => {
        if (!data || data.length === 0) return;
        
        // Remove duplicates within the data itself
        const uniqueData = removeDuplicates(data);
        
        if (key === 'speedDial') { 
          currentSpeedDialTracks = filterUsedTracks(filterShortTracks(uniqueData)).slice(0, 45); 
          setSpeedDialTracks(currentSpeedDialTracks); 
        }
        else if (key === 'quickPicks') { 
          currentQuickPicksTracks = filterUsedTracks(filterShortTracks(uniqueData)).slice(0, 20); 
          setQuickPicksTracks(currentQuickPicksTracks); 
        }
        else if (key === 'community') { 
          const verifiedPlaylists = [
            { playlistId: 'PLPFzKsPt50V8azAzY0Sg2go23AL9nuAAF' }, // songs to vibe to
            { playlistId: 'PLyBxKXnR4L89zxuxXdrXdWvphJkctdPdi' }, // Top 50 Lagu Indie Indonesia
            { playlistId: 'PLo3pNg0eiPc_JHZ-1jjCYbup7_rT3CBl8' }, // Late Night Songs Playlist
            { playlistId: 'PL3EfCK9aCbkptFjtgWYJ8wiXgJQw5k3M3' }, // Best of Chill Nation
            { playlistId: 'PLyORnIW1xT6z8za6mAQhjjzr_EQTq8qcY' }  // Best Indie Songs of 2026
          ];
          const otherPlaylists = uniqueData.filter((p: any) => 
            p.playlistId && !verifiedPlaylists.some(vp => vp.playlistId === p.playlistId)
          );
          currentCommunityPlaylists = [...verifiedPlaylists, ...otherPlaylists].slice(0, 10);
          setCommunityPlaylists(currentCommunityPlaylists); 
        }
        else if (key === 'artists') { 
          currentArtists = uniqueData.slice(0, 10); 
          setArtists(currentArtists); 
        }
        else if (key.startsWith('cat') && title) {
          const filteredItems = filterUsedTracks(filterShortTracks(uniqueData)).slice(0, 15);
          if (filteredItems.length > 0) {
            currentCats.push({ key, title, type: 'song', items: filteredItems });
          }
        }
        else if (key.startsWith('similar') && title) {
          const filteredItems = filterUsedTracks(filterShortTracks(uniqueData)).slice(0, 15);
          if (filteredItems.length > 0) {
            currentCats.push({ key, title, type: 'mixed', items: filteredItems });
          }
        }

        if (key.startsWith('cat') || key.startsWith('similar')) {
           currentCats.sort((a, b) => (orderMap.get(a.key) ?? 999) - (orderMap.get(b.key) ?? 999));
           setCategories([...currentCats]);
        }
        
        setHomeData({
          heroTracks: currentHeroTracks,
          speedDialTracks: currentSpeedDialTracks,
          quickPicksTracks: currentQuickPicksTracks,
          communityPlaylists: currentCommunityPlaylists,
          artists: currentArtists,
          categories: currentCats,
          timestamp: Date.now(),
          version: '1.8'
        });

      };

      const fetchQuery = async ({ key, title, q, type }: any) => {
        try {
          const url = type 
            ? `/api/search?q=${encodeURIComponent(q)}&type=${type}`
            : `/api/search?q=${encodeURIComponent(q)}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            processResult(key, title, data);
          }
        } catch (e) {
          console.error(e);
        }
      };

      // Special fetch for hero section as requested
      const fetchHeroTracks = async () => {
        const heroQueries = [
          "Sabrina Carpenter Espresso official audio",
          "Billie Eilish Birds of a Feather official audio",
          "Hindia Secukupnya official audio",
          "Nadin Amizah Semua Aku Dirayakan official audio",
          "Ghea Indrawari Jiwa Yang Bersedih official audio",
          "Bernadya Satu Bulan official audio",
          "Dave How I Met My Ex official audio",
          "Olivia Rodrigo Vampire official audio",
          "Coldplay Yellow official audio",
          "Billie Eilish Chihiro official audio",
          "Hindia Rumah ke Rumah official audio",
          "Taylor Swift Cruel Summer official audio",
          "The Weeknd Blinding Lights official audio",
          "Post Malone Sunflower official audio",
          "One Direction Night Changes official audio",
          "Rex Orange County Sunflower official audio",
          "Laufey From The Start official audio",
          "Adele Easy On Me official audio",
          "Harry Styles As It Was official audio",
          "Linkin Park In The End official audio",
          "Billie Eilish Bad Guy official audio"
        ];

        // Shuffle the queries and take 15
        const shuffledQueries = shuffleArray(heroQueries).slice(0, 15);
        const trendingQuery = "top global hits 2024";
        
        try {
          const heroPromises = shuffledQueries.map(q => 
            fetch(`/api/search?q=${encodeURIComponent(q)}&type=song`).then(res => res.json())
          );
          const trendingPromise = fetch(`/api/search?q=${encodeURIComponent(trendingQuery)}&type=song`).then(res => res.json());
          
          const [heroResults, trendResults] = await Promise.all([
            Promise.all(heroPromises),
            trendingPromise
          ]);
          
          const firstTracks: Track[] = [];
          const seenIds = new Set<string>();
          
          heroResults.forEach(res => {
            if (Array.isArray(res)) {
              // Find the first result that hasn't been added yet
              const bestMatch = res.find(t => t.videoId && !seenIds.has(t.videoId));
              if (bestMatch) {
                firstTracks.push(bestMatch);
                seenIds.add(bestMatch.videoId);
              }
            }
          });
          
          const otherTracks = Array.isArray(trendResults) 
            ? trendResults.filter(t => t.videoId && !seenIds.has(t.videoId)).slice(0, 18 - firstTracks.length) 
            : [];
          
          // Shuffle the combined hero tracks so the order is different on every load
          const finalHeroTracks = shuffleArray([...firstTracks, ...otherTracks]);
          
          currentHeroTracks = finalHeroTracks;
          setHeroTracks(currentHeroTracks);
        } catch (e) {
          console.error("Hero fetch error", e);
        }
      };

      // Fetch popular artists deterministically to show a rich selection
      const fetchArtists = async () => {
        const artistNames = [
          "The Weeknd",
          "Taylor Swift",
          "Billie Eilish",
          "Bruno Mars",
          "Sabrina Carpenter",
          "Coldplay",
          "Laufey",
          "Bernadya",
          "Hindia",
          "Nadin Amizah",
          "Ariana Grande",
          "Olivia Rodrigo",
          "Justin Bieber",
          "Dua Lipa",
          "Ed Sheeran",
          "Post Malone",
          "One Direction",
          "Adele",
          "Eminem",
          "Tulus",
          "Sheila on 7",
          "Dewa 19",
          "Sal Priadi",
          "Juicy Luicy",
          "Pamungkas",
          "Tiara Andini",
          "Mahalini",
          "Lyodra",
          "Rizky Febian",
          "Alan Walker"
        ];
        
        try {
          const artistPromises = artistNames.map(name =>
            fetch(`/api/search?q=${encodeURIComponent(name)}&type=artist`).then(res => res.json())
          );
          const results = await Promise.all(artistPromises);
          
          const uniqueArtists: any[] = [];
          const seenIds = new Set<string>();
          
          results.forEach(res => {
            if (Array.isArray(res)) {
              const bestMatch = res.find(a => a.artistId && !seenIds.has(a.artistId));
              if (bestMatch) {
                uniqueArtists.push(bestMatch);
                seenIds.add(bestMatch.artistId);
              }
            }
          });
          
          currentArtists = uniqueArtists;
          setArtists(currentArtists);
        } catch (e) {
          console.error("Artists fetch error", e);
        }
      };

      // Fetch hero and artists in parallel first so we can filter them out from other sections
      await Promise.all([fetchHeroTracks(), fetchArtists()]);

      // Save initial data to persistent storage
      setHomeData({
        heroTracks: currentHeroTracks,
        speedDialTracks: currentSpeedDialTracks,
        quickPicksTracks: currentQuickPicksTracks,
        communityPlaylists: currentCommunityPlaylists,
        artists: currentArtists,
        categories: currentCats,
        timestamp: Date.now(),
        version: '1.6'
      });
      
      // Fetch speedDial next
      const essentialQueries = allQueries.filter(q => ['speedDial'].includes(q.key));
      await Promise.allSettled(essentialQueries.map(fetchQuery));
      setLoading(false); // Remove skeleton and render UI

      // Fetch the rest in the background without blocking the UI
      const otherQueries = allQueries.filter(q => !['speedDial'].includes(q.key));
      (async () => {
        for (let i = 0; i < otherQueries.length; i += 2) {
          const chunk = otherQueries.slice(i, i + 2);
          await Promise.allSettled(chunk.map(fetchQuery));
        }
      })();


    } catch (error) {
      console.error('Failed to fetch home data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasMounted) fetchHomeData();
  }, [hasMounted]);

  if (!hasMounted || loading) {
    return (
      <main className="min-h-screen pt-24 pb-32 bg-[#050505]">
        <div className="flex items-center gap-2 px-6 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-8 bg-white/5 rounded-lg w-32 animate-pulse" />
        </div>
        <HomeSkeleton />
      </main>
    );
  }


  return (
    <main className="min-h-screen pt-6 pb-32 bg-[#050505] selection:bg-[#FA243C]/30 overflow-x-hidden w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 mb-8 sticky top-0 z-30 py-4 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Beranda</h1>
        
        <DesktopSearch />

        <div className="flex items-center gap-4 text-white/80">
          <Link href="/history" className="hover:text-white transition-all transform hover:scale-105">
            <History className="w-6 h-6" />
          </Link>
          <button className="hover:text-white transition-all transform hover:scale-105">
            <Cast className="w-6 h-6" />
          </button>
          <Link href="/developer" className="hover:text-white transition-all transform hover:scale-105">
            <img src="/zutify.png" className="w-7 h-7 object-contain" alt="ZUTIFY" />
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div 
        {...dragFilters}
        className="flex overflow-x-auto no-scrollbar gap-2.5 px-6 mb-8 select-none"
      >
        {pills.map((pill) => (
          <button 
            key={pill} 
            onClick={() => setActiveFilter(activeFilter === pill ? null : pill)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-extrabold tracking-wide transition-all border-none ${
              activeFilter === pill 
                ? 'bg-[#FA243C] text-white shadow-lg shadow-[#FA243C]/20 scale-105' 
                : 'bg-[#232323] hover:bg-[#2e2e2e] text-white/95'
            }`}
          >
            {pill}
          </button>
        ))}
      </div>

      {loading || (activeFilter && loadingFilter) ? (
        <HomeSkeleton />
      ) : activeFilter ? (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 px-2">
          {filterData.map((cat, i) => (
            <HorizontalScroll key={i} title={cat.title} tracks={cat.tracks} />
          ))}
          
          <div className="px-6 mb-10">
            <h2 className="text-xl font-bold text-white mb-6">Suasana Hati dan Genre</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {pills.slice(0, 12).map((p) => (
                <button
                  key={p}
                  onClick={() => setActiveFilter(p)}
                  className="bg-white/5 hover:bg-white/10 text-white font-medium py-4 px-4 rounded-2xl text-center transition-all border border-white/5 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="text-sm relative z-10">{p}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-14 animate-in fade-in duration-1000">
          {/* Hero Section */}
          {heroTracks.length > 0 && (
            <div 
              {...dragHero}
              className="flex overflow-x-auto no-scrollbar gap-5 px-6 pb-6 select-none"
            >
              {heroTracks.map((track, i) => {
                const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(' & ') : track.artist?.name || 'Unknown Artist';
                return (
                  <motion.div 
                    key={`hero-${track.videoId}-${i}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: [0.23, 1, 0.32, 1] }}
                    className="relative w-[85vw] sm:w-[380px] shrink-0 aspect-[4/5] rounded-[2rem] overflow-hidden cursor-pointer group shadow-2xl"
                    onClick={() => playTrack(track, heroTracks, 'similar')}
                  >
                    <ImageWithFallback 
                      src={getBestThumbnail(track.thumbnails, 1000, track.videoId)} 
                      alt={track.name} 
                      fill 
                      priority={i === 0}
                      sizes="(max-width: 640px) 85vw, 380px"
                      className="object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="absolute top-6 left-6 right-6">
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-lg">{track.name}</h2>
                      <p className="text-white/80 text-sm sm:text-base font-semibold mt-1.5">{artistName}</p>
                    </div>
                    
                    <div className="absolute bottom-6 left-6 right-6">
                      <p className="text-white/80 text-xs sm:text-sm font-semibold tracking-wide drop-shadow-md">
                        Sounds like {track.name} • {artistName}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Speed Dial */}
          {speedDialTracks.length > 0 && (
            <div className="mb-12">
              <div className="px-6 mb-4">
                <h2 className="text-3xl font-black text-white tracking-tighter italic">Speed Dial</h2>
                <p className="text-white/50 text-sm font-medium">Quick hits for your current mood</p>
              </div>
              <div 
                {...dragSpeedDial}
                className="flex overflow-x-auto no-scrollbar gap-5 px-6 pb-6 select-none"
              >
                {speedDialTracks.map((track, i) => {
                  const thumbnail = getBestThumbnail(track.thumbnails, 400, track.videoId);
                  const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || 'Unknown Artist';
                  
                  return (
                    <motion.div 
                      key={`speeddial-${track.videoId}-${i}`}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                      className="flex-none w-40 sm:w-44 cursor-pointer group"
                      onClick={() => playTrack(track, speedDialTracks, 'similar')}
                    >
                      <div className="relative aspect-square rounded-[1.75rem] overflow-hidden mb-3.5 premium-shadow group-hover:scale-[1.03] transition-all duration-500">
                        <ImageWithFallback src={thumbnail} alt={track.name} fill sizes="(max-width: 640px) 160px, 176px" className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
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
          )}

          {/* Quick Picks */}
          {quickPicksTracks.length > 0 && (
            <div className="px-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tighter italic">Quick Picks</h2>
                  <p className="text-white/50 text-sm font-medium">Hand-picked for you</p>
                </div>
                <button 
                  className="bg-white/5 hover:bg-white text-white/80 hover:text-black font-bold py-2 px-6 rounded-2xl transition-all duration-300 border border-white/10 hover:border-white shadow-xl"
                  onClick={() => playTrack(quickPicksTracks[0], quickPicksTracks, 'similar')}
                >
                  Play All
                </button>
              </div>
              <div 
                {...dragQuickPicks}
                className="flex overflow-x-auto no-scrollbar gap-6 pb-4 select-none"
              >
                {Array.from({ length: Math.ceil(quickPicksTracks.length / 4) }).map((_, i) => {
                  const chunk = quickPicksTracks.slice(i * 4, i * 4 + 4);
                  return (
                    <motion.div 
                      key={`quickpicks-chunk-${i}`}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="w-[85vw] sm:w-[450px] shrink-0 flex flex-col gap-4"
                    >
                      {chunk.map((track, j) => {
                        const thumbnail = getBestThumbnail(track.thumbnails, 200, track.videoId);
                        return (
                          <div 
                            key={`quickpicks-${track.videoId}-${j}`}
                            className="flex items-center gap-4 cursor-pointer group hover:bg-white/5 p-3 -mx-2 rounded-2xl active:scale-[0.98] transition-all duration-300"
                            onClick={() => playTrack(track, quickPicksTracks, 'similar')}
                          >
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-lg">
                              <ImageWithFallback src={thumbnail} alt={track.name} fill sizes="64px" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-6 h-6 text-white fill-current" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <MarqueeText text={track.name} className="text-white font-bold text-lg leading-tight" />
                              <MarqueeText 
                                text={Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name} 
                                className="text-white/50 text-sm font-medium mt-0.5" 
                              />
                            </div>
                            <button className="p-3 text-white/30 hover:text-white transition-colors">
                              <MoreVertical className="w-6 h-6" />
                            </button>
                          </div>
                        );
                      })}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Community Playlists */}
          {communityPlaylists.length > 0 && (
            <div className="px-6">
              <h2 className="text-2xl font-black text-[#81B29A] tracking-tighter mb-6 uppercase">From the community</h2>
              <div 
                {...dragCommunity}
                className="flex overflow-x-auto no-scrollbar gap-6 pb-4 select-none"
              >
                {communityPlaylists.map((playlist, i) => {
                  const id = playlist.playlistId;
                  if (!id) return null;
                  return <CommunityPlaylistCard key={`community-playlist-${id}-${i}`} playlistId={id} />;
                })}
              </div>
            </div>
          )}

          {/* Artists */}
          {artists.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white tracking-tighter mb-8 px-6 italic">Artists You Love</h2>
              <div 
                {...dragArtists}
                className="flex overflow-x-auto no-scrollbar gap-8 px-6 pb-6 select-none"
              >
                {artists.map((artist, i) => {
                  const artistName = artist.name || 'Artist';
                  return (
                    <Link href={`/artist/${artist.artistId}`} key={`artist-${artist.artistId}-${i}`}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 100, delay: i * 0.05 }}
                        className="flex flex-col items-center gap-4 cursor-pointer group shrink-0"
                      >
                        <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-2xl transition-all duration-500 ring-4 ring-white/5 group-hover:ring-[#FA243C]/50 group-hover:scale-105">
                          <ImageWithFallback src={getBestThumbnail(artist.thumbnails, 400, artist.artistId)} alt={artistName} fill sizes="128px" className="object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-10 h-10 text-white fill-current" />
                          </div>
                        </div>
                        <div className="text-center w-full max-w-[128px]">
                          <MarqueeText text={artistName} className="text-sm font-bold text-white" />
                          <div className="text-[10px] font-black uppercase tracking-widest text-[#FA243C] mt-1 opacity-70">Artist</div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scrollable Categories */}
          <div className="pb-10">
            {categories.map((cat, i) => (
              cat.type === 'mixed' ? (
                <MixedScroll key={i} title={cat.title} items={cat.items} />
              ) : (
                <HorizontalScroll key={i} title={cat.title} tracks={cat.items} />
              )
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
