'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, ArrowUpLeft, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db, RecentSearch } from '@/lib/db';
import { Track, usePlayerStore } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { TrackItem } from './TrackItem';
import { ImageWithFallback } from './ImageWithFallback';
import { getBestThumbnail } from '@/lib/utils';
import { MarqueeText } from './MarqueeText';

export function DesktopSearch() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<Track[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadRecentSearches = async () => {
      const searches = await db.getRecentSearches();
      setRecentSearches(searches.slice(0, 5));
    };
    if (isFocused) loadRecentSearches();
  }, [isFocused]);

  useEffect(() => {
    const fetchData = async () => {
      if (query.trim()) {
        setLoading(true);
        try {
          // Fetch both suggestions and quick results
          const [suggestRes, searchRes] = await Promise.all([
            fetch(`/api/suggest?q=${encodeURIComponent(query)}`),
            fetch(`/api/search?q=${encodeURIComponent(query)}&type=song`)
          ]);
          
          const suggestData = await suggestRes.json();
          const searchData = await searchRes.json();
          
          setSuggestions(suggestData.slice(0, 4));
          setResults(searchData.slice(0, 8));
        } catch (error) {
          setSuggestions([]);
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
        setResults([]);
        setLoading(false);
      }
    };
    
    const debounceTimer = setTimeout(fetchData, 400);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsFocused(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="hidden md:block relative w-full max-w-md mx-4">
      <form onSubmit={onSubmit} className="relative group">
        <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors ${isFocused ? 'text-[#FA243C]' : 'text-white/40 group-hover:text-white/60'}`}>
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Cari lagu, artis, atau album..."
          className={`w-full bg-white/5 hover:bg-white/10 text-white rounded-2xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-[#FA243C]/50 transition-all border border-white/5 placeholder:text-white/20 font-medium ${isFocused ? 'bg-white/10 ring-2 ring-[#FA243C]/50' : ''}`}
        />
        {query && (
          <button 
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full mt-3 left-0 right-0 bg-[#121212] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
          >
            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 px-4 mb-2">
                  <History className="w-4 h-4 text-white/40" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Pencarian Terakhir</span>
                </div>
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(search.query)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 rounded-2xl transition-colors text-left group"
                  >
                    <span className="text-white/80 group-hover:text-white">{search.query}</span>
                    <ArrowUpLeft className="w-4 h-4 text-white/20 group-hover:text-[#FA243C] transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Suggestions & Results */}
            {query && (
              <div className="max-h-[70vh] overflow-y-auto no-scrollbar p-2 space-y-4">
                {/* Suggestions Section */}
                {suggestions.length > 0 && (
                  <div className="px-2">
                    <div className="flex items-center gap-2 mb-2 opacity-40">
                      <Search className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Saran</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setQuery(suggestion);
                            // It will trigger the useEffect to fetch new results
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl transition-colors text-left group"
                        >
                          <Search className="w-4 h-4 text-white/20 group-hover:text-[#FA243C]" />
                          <span className="text-white/70 group-hover:text-white text-sm font-medium truncate">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results Section */}
                <div className="px-2">
                  <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2 opacity-40">
                      <Loader2 className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Lagu Populer</span>
                    </div>
                    {results.length > 0 && (
                      <button 
                        onClick={() => handleSearch(query)}
                        className="text-[10px] font-black uppercase tracking-widest text-[#FA243C] hover:underline"
                      >
                        Lihat Semua
                      </button>
                    )}
                  </div>

                  {loading && results.length === 0 ? (
                    <div className="py-8 text-center opacity-20">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-xs">Mencari...</p>
                    </div>
                  ) : results.length > 0 ? (
                    <div className="space-y-1">
                      {results.map((track, i) => {
                        const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name;
                        return (
                          <div 
                            key={track.videoId}
                            onClick={() => {
                              playTrack(track, results);
                              setIsFocused(false);
                            }}
                            className="flex items-center gap-4 p-2.5 hover:bg-white/5 rounded-2xl cursor-pointer group transition-all active:scale-[0.98]"
                          >
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg">
                              <ImageWithFallback 
                                src={getBestThumbnail(track.thumbnails, 100, track.videoId)} 
                                alt={track.name} 
                                fill 
                                className="object-cover group-hover:scale-110 transition-transform duration-500" 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold text-sm truncate">{track.name}</div>
                              <div className="text-white/40 text-xs truncate">{artistName}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : query.length > 2 && !loading ? (
                    <div className="py-8 text-center opacity-20">
                      <p className="text-xs">Tidak ada hasil ditemukan</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {!query && recentSearches.length === 0 && (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-white/10" />
                </div>
                <p className="text-white/40 text-sm font-medium">Cari lagu, artis, atau album favoritmu</p>
                <p className="text-white/20 text-[10px] mt-2 font-bold uppercase tracking-widest">ZUTIFY Premium Experience</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
