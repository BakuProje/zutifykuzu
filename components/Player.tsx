'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/lib/store';
import { db } from '@/lib/db';
import YouTube from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, Heart, ChevronDown, ListMusic, ListPlus, Mic2, Shuffle, Repeat, Repeat1, MonitorPlay as PipIcon, User } from 'lucide-react';
import { cn, getHighResImage, getBestThumbnail } from '@/lib/utils';
import { ImageWithFallback } from './ImageWithFallback';
import { useRouter } from 'next/navigation';

import { MarqueeText } from './MarqueeText';
import { LovePopup } from './LovePopup';

import { useHasMounted } from '@/hooks/useHasMounted';

export function Player() {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isExpanded = usePlayerStore((state) => state.isExpanded);
  const progress = usePlayerStore((state) => state.progress);
  const duration = usePlayerStore((state) => state.duration);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const setPlaying = usePlayerStore((state) => state.setPlaying);
  const setExpanded = usePlayerStore((state) => state.setExpanded);
  const setProgress = usePlayerStore((state) => state.setProgress);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrev = usePlayerStore((state) => state.playPrev);
  const dominantColor = usePlayerStore((state) => state.dominantColor);
  const isShuffle = usePlayerStore((state) => state.isShuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const toggleRepeat = usePlayerStore((state) => state.toggleRepeat);
  const setTrackToAdd = usePlayerStore((state) => state.setTrackToAdd);
  const trackToAdd = usePlayerStore((state) => state.trackToAdd);

  const [isLiked, setIsLiked] = useState(false);
  const [showLovePopup, setShowLovePopup] = useState(false);
  const [lyrics, setLyrics] = useState<{ text: string }[] | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<{ time: number; text: string }[] | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [activeLyricsIndex, setActiveLyricsIndex] = useState(-1);
  const lastProgressRef = useRef(0);
  const lastProgressTimeRef = useRef(0);
  const activeIndexRef = useRef(-1);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [localAudioLoaded, setLocalAudioLoaded] = useState(false);
  const playerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const volume = usePlayerStore((state) => state.volume);

  const isLocal = !!currentTrack?.videoId?.startsWith('local-');

  // Load local audio blob
  useEffect(() => {
    let currentUrl: string | null = null;
    
    if (isLocal && currentTrack) {
      setLocalAudioLoaded(false); // Reset while loading
      const loadLocalAudio = async () => {
        try {
          const uploadedSongs = await db.getUploadedSongs();
          const downloadedSongs = await db.getDownloadedSongs();
          
          const trackData = uploadedSongs.find(s => s.videoId === currentTrack.videoId) || 
                          downloadedSongs.find(s => s.videoId === currentTrack.videoId);

          if (trackData?.audioBlob && audioRef.current) {
            currentUrl = URL.createObjectURL(trackData.audioBlob);
            if (audioRef.current) {
              audioRef.current.src = currentUrl;
              audioRef.current.load();
              setLocalAudioLoaded(true);
            }
          }
        } catch (error) {
          console.error('Failed to load local audio:', error);
        }
      };
      loadLocalAudio();
    } else {
      setLocalAudioLoaded(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }

    return () => {
      setLocalAudioLoaded(false);
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [currentTrack?.videoId, isLocal]);

  const artistName = currentTrack 
    ? (Array.isArray(currentTrack.artist) 
        ? currentTrack.artist.map((a: any) => a.name).join(', ') 
        : (currentTrack.artist as any)?.name || 'Unknown Artist') 
    : '';
  const thumbnail = currentTrack ? getBestThumbnail(currentTrack.thumbnails, 800, currentTrack.videoId) : '';

  // Reset lyrics when track changes
  useEffect(() => {
    setLyrics(null);
    setSyncedLyrics(null);
    setActiveLyricsIndex(-1);
    activeIndexRef.current = -1;
  }, [currentTrack?.videoId]);

  useEffect(() => {
    if (currentTrack) {
      db.isLiked(currentTrack.videoId).then(setIsLiked);
    }
  }, [currentTrack, trackToAdd]); // Re-check when modal closes (trackToAdd becomes null)

  useEffect(() => {
    if (currentTrack && showLyrics && !lyrics) {
      setLyrics(null);
      setSyncedLyrics(null);
      const trackTitle = encodeURIComponent(currentTrack.name || '');
      const trackArtist = encodeURIComponent(artistName || '');
      fetch(`/api/lyrics?id=${currentTrack.videoId}&artist=${trackArtist}&title=${trackTitle}&t=${Date.now()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.synced && Array.isArray(data.synced) && data.synced.length > 0) {
            setSyncedLyrics(data.synced);
            setLyrics(data.synced.map((line: any) => ({ text: line.text })));
          } else if (data.lyrics && Array.isArray(data.lyrics)) {
            setLyrics(data.lyrics.map((line: string) => ({ text: line })));
            setSyncedLyrics([]); // Empty array means plain lyrics only (no timed sync)
          } else {
            setLyrics([]); // Empty means not found
            setSyncedLyrics([]);
          }
        })
        .catch(() => {
          setLyrics([]);
          setSyncedLyrics([]);
        });
    }
  }, [currentTrack, showLyrics, lyrics, artistName]);

  useEffect(() => {
    activeIndexRef.current = activeLyricsIndex;
  }, [activeLyricsIndex]);

  useEffect(() => {
    lastProgressRef.current = progress;
    lastProgressTimeRef.current = performance.now();
  }, [progress]);

  const getExactTime = useCallback(() => {
    if (isLocal && audioRef.current) {
      return audioRef.current.currentTime;
    }
    let exactTime = lastProgressRef.current;
    if (isPlaying) {
      const elapsedMs = performance.now() - lastProgressTimeRef.current;
      exactTime += elapsedMs / 1000;
    }
    return exactTime;
  }, [isLocal, isPlaying]);

  useEffect(() => {
    if (showLyrics && activeLyricsIndex !== -1 && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeElement = container.querySelector(`[data-lyrics-index="${activeLyricsIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }

    // Reset all inline styles for lyric words when the active line changes
    if (lyricsContainerRef.current) {
      const allWords = lyricsContainerRef.current.querySelectorAll('.lyric-word') as NodeListOf<HTMLSpanElement>;
      allWords.forEach(word => {
        word.style.color = '';
        word.style.backgroundImage = '';
        word.style.webkitBackgroundClip = '';
        word.style.backgroundClip = '';
      });
    }
  }, [activeLyricsIndex, showLyrics]);

  // Smooth 60fps Karaoke animation loop and active index updates
  useEffect(() => {
    let animId: number;
    
    const updateKaraokeProgress = () => {
      if (showLyrics && syncedLyrics && syncedLyrics.length > 0) {
        // Add a small 150ms offset so the highlight leads the vocals slightly (feels much more responsive)
        const exactTime = getExactTime() + 0.15;
        
        // Find active line index based on exact time
        const newIndex = syncedLyrics.findIndex((line, idx) => {
          const nextLine = syncedLyrics[idx + 1];
          return exactTime >= line.time && (!nextLine || exactTime < nextLine.time);
        });
        
        if (newIndex !== activeIndexRef.current) {
          setActiveLyricsIndex(newIndex);
          activeIndexRef.current = newIndex;
        }
        
        if (newIndex !== -1) {
          const currentLine = syncedLyrics[newIndex];
          const nextLine = syncedLyrics[newIndex + 1];
          
          let lineDuration = 5;
          if (nextLine) {
            lineDuration = nextLine.time - currentLine.time;
          } else if (duration > 0) {
            lineDuration = duration - currentLine.time;
          }
          
          const elapsed = exactTime - currentLine.time;
          const ratio = Math.max(0, Math.min(1, elapsed / (lineDuration || 1)));
          
          if (lyricsContainerRef.current) {
            const activeEl = lyricsContainerRef.current.querySelector(
              `[data-lyrics-index="${newIndex}"]`
            );
            if (activeEl) {
              const wordEls = activeEl.querySelectorAll('.lyric-word') as NodeListOf<HTMLSpanElement>;
              if (wordEls.length > 0) {
                const totalWords = wordEls.length;
                const wordRatio = 1 / totalWords;
                
                wordEls.forEach((wordEl, idx) => {
                  const wordStart = idx * wordRatio;
                  
                  if (ratio >= wordStart) {
                    // Word has been reached or sung -> white
                    wordEl.style.color = '#ffffff';
                  } else {
                    // Word has not been reached -> gray
                    wordEl.style.color = 'rgba(255, 255, 255, 0.3)';
                  }
                  wordEl.style.backgroundImage = 'none';
                  wordEl.style.webkitBackgroundClip = 'initial';
                  wordEl.style.backgroundClip = 'initial';
                });
              } else {
                // Fallback for non-split/plain text rendering
                const percentage = ratio * 100;
                (activeEl as HTMLElement).style.setProperty('--progress', `${percentage}%`);
              }
            }
          }
        }
      }
      animId = requestAnimationFrame(updateKaraokeProgress);
    };
    
    if (showLyrics && syncedLyrics && syncedLyrics.length > 0) {
      animId = requestAnimationFrame(updateKaraokeProgress);
    }
    
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [showLyrics, syncedLyrics, getExactTime, duration]);

  // Prevent background body scroll when player is expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  const handleLike = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentTrack) return;
    setShowLovePopup(true);
  }, [currentTrack]);

  const handleLovePopupClose = useCallback(() => {
    setShowLovePopup(false);
    // Re-check liked status after popup closes
    if (currentTrack) {
      db.isLiked(currentTrack.videoId).then(setIsLiked);
    }
  }, [currentTrack]);

  const handleAddToPlaylist = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentTrack) return;
    setTrackToAdd(currentTrack);
  }, [currentTrack, setTrackToAdd]);

  const onReady = useCallback(async (event: any) => {
    if (isLocal) return;
    playerRef.current = event.target;
    if (!isLocal) {
      const durationValue = await event.target.getDuration();
      setDuration(durationValue || 0);
      if (isPlaying) {
        event.target.playVideo();
      }
    }
    event.target.setVolume(volume);
  }, [setDuration, volume, isLocal, isPlaying]);

  const onError = useCallback((event: any) => {
    if (isLocal) return;
    if (event.data !== 2) {
      console.error('YouTube Player Error:', event.data);
    }
    // If there is an error (e.g. video restricted, unavailable), skip to the next track
    playNext();
  }, [playNext, isLocal]);

  useEffect(() => {
    if (isLocal) {
      playerRef.current = null;
    }
  }, [isLocal]);

  const onStateChange = useCallback(async (event: any) => {
    if (isLocal) return;
    if (event.data === YouTube.PlayerState.PLAYING) {
      setPlaying(true);
      const durationValue = await event.target.getDuration();
      setDuration(durationValue || 0);
    } else if (event.data === YouTube.PlayerState.PAUSED) {
      if (usePlayerStore.getState().isPlaying) {
        event.target.playVideo();
      } else {
        setPlaying(false);
      }
    } else if (event.data === YouTube.PlayerState.ENDED) {
      const mode = usePlayerStore.getState().repeatMode;
      if (mode === 'one') {
        event.target.seekTo(0);
        event.target.playVideo();
      } else {
        playNext();
      }
    }
  }, [setPlaying, setDuration, playNext, isLocal]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(async () => {
        if (!isLocal && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const time = await playerRef.current.getCurrentTime();
          setProgress(time || 0);
        } else if (isLocal && audioRef.current) {
          setProgress(audioRef.current.currentTime);
          setDuration(audioRef.current.duration || 0);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, setProgress, isLocal, setDuration]);

  useEffect(() => {
    if (hasMounted && currentTrack && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: artistName,
        album: 'ZUTIFY',
        artwork: [
          { src: thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          if (!isLocal && playerRef.current) {
            playerRef.current.seekTo(details.seekTime, true);
          } else if (isLocal && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
          }
          setProgress(details.seekTime);
        }
      });
    }
  }, [currentTrack, hasMounted, setPlaying, playNext, playPrev, setProgress, isLocal]);

  useEffect(() => {
    if (hasMounted) {
      if (isPlaying) {
        if (!isLocal && playerRef.current && typeof playerRef.current.playVideo === 'function') {
          try {
            playerRef.current.playVideo();
          } catch (e) {
            console.error('Error playing YouTube video:', e);
          }
        } else if (isLocal && audioRef.current && localAudioLoaded) {
          audioRef.current.play().catch((e) => {
            if (e.name !== 'AbortError') {
              console.error('Error playing local audio:', e);
            }
          });
        }
        
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        // Resume PiP video so canvas stream continues displaying
        if (isPiPActive && pipVideoRef.current && pipVideoRef.current.paused) {
          pipVideoRef.current.play().catch(() => {});
        }
      } else {
        if (!isLocal && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
          try {
            playerRef.current.pauseVideo();
          } catch (e) {
            console.error('Error pausing YouTube video:', e);
          }
        } else if (isLocal && audioRef.current) {
          audioRef.current.pause();
        }

        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        // Pause PiP video so Chrome's PiP button shows correct icon
        if (isPiPActive && pipVideoRef.current && !pipVideoRef.current.paused) {
          pipVideoRef.current.pause();
        }
      }
    }
  }, [isPlaying, hasMounted, isPiPActive, isLocal, localAudioLoaded]);

  useEffect(() => {
    if (hasMounted) {
      if (!isLocal && playerRef.current) playerRef.current.setVolume(volume);
      else if (isLocal && audioRef.current) audioRef.current.volume = volume / 100;
    }
  }, [volume, hasMounted, isLocal]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && usePlayerStore.getState().isPlaying) {
        if (!isLocal && playerRef.current) playerRef.current.playVideo();
        else if (isLocal && audioRef.current) audioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLocal]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    const unlockAudio = () => {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioCtxRef.current = new AudioContext();
          const osc = audioCtxRef.current.createOscillator();
          const gainNode = audioCtxRef.current.createGain();
          gainNode.gain.value = 0.0001; // Almost silent
          osc.connect(gainNode);
          gainNode.connect(audioCtxRef.current.destination);
          osc.start();
          oscillatorRef.current = osc;

          if (!usePlayerStore.getState().isPlaying) {
            audioCtxRef.current.suspend();
          }
        }
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (audioCtxRef.current) {
      if (isPlaying) {
        audioCtxRef.current.resume().catch(() => {});
      } else {
        audioCtxRef.current.suspend().catch(() => {});
      }
    }
  }, [isPlaying]);

  // PiP Logic: Continuously draw cover, progress, and state to canvas
  const pipImgRef = useRef<HTMLImageElement | null>(null);
  const pipAnimFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!isPiPActive || !currentTrack || !canvasRef.current || !pipVideoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load album image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getBestThumbnail(currentTrack.thumbnails, 800, currentTrack.videoId);
    img.onload = () => { pipImgRef.current = img; };

    // Start canvas stream for PiP video
    const stream = canvas.captureStream(30);
    pipVideoRef.current.srcObject = stream;
    pipVideoRef.current.play().catch(() => {});

    // Continuous render loop
    const drawFrame = () => {
      const W = canvas.width;
      const H = canvas.height;
      const state = usePlayerStore.getState();
      const prog = state.progress || 0;
      const dur = state.duration || 1;
      const playing = state.isPlaying;

      // Background - dark gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#181818');
      bgGrad.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Draw album art (full bleed background with blur effect via semi-transparent overlay)
      if (pipImgRef.current) {
        // Draw blurred background image
        ctx.globalAlpha = 0.3;
        ctx.drawImage(pipImgRef.current, 0, 0, W, H);
        ctx.globalAlpha = 1;

        // Dark overlay for contrast
        const overlay = ctx.createLinearGradient(0, 0, 0, H);
        overlay.addColorStop(0, 'rgba(0,0,0,0.4)');
        overlay.addColorStop(0.5, 'rgba(0,0,0,0.2)');
        overlay.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, W, H);

        // Main album art - centered with padding
        const artSize = W * 0.7;
        const artX = (W - artSize) / 2;
        const artY = H * 0.08;
        
        // Shadow for album art
        ctx.shadowBlur = 60;
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowOffsetY = 10;
        
        // Draw rounded rect clip for album art
        const radius = 16;
        ctx.beginPath();
        ctx.moveTo(artX + radius, artY);
        ctx.lineTo(artX + artSize - radius, artY);
        ctx.quadraticCurveTo(artX + artSize, artY, artX + artSize, artY + radius);
        ctx.lineTo(artX + artSize, artY + artSize - radius);
        ctx.quadraticCurveTo(artX + artSize, artY + artSize, artX + artSize - radius, artY + artSize);
        ctx.lineTo(artX + radius, artY + artSize);
        ctx.quadraticCurveTo(artX, artY + artSize, artX, artY + artSize - radius);
        ctx.lineTo(artX, artY + radius);
        ctx.quadraticCurveTo(artX, artY, artX + radius, artY);
        ctx.closePath();
        ctx.save();
        ctx.clip();
        ctx.drawImage(pipImgRef.current, artX, artY, artSize, artSize);
        ctx.restore();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }

      // Track info area
      const infoY = H * 0.08 + W * 0.7 + 30;

      // Track name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      const trackName = currentTrack.name.length > 30 
        ? currentTrack.name.substring(0, 28) + '...' 
        : currentTrack.name;
      ctx.fillText(trackName, W / 2, infoY);

      // Artist name
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '22px Outfit, Inter, sans-serif';
      const artName = artistName.length > 35 
        ? artistName.substring(0, 33) + '...' 
        : artistName;
      ctx.fillText(artName, W / 2, infoY + 34);

      // Progress bar area
      const barY = infoY + 65;
      const barX = W * 0.1;
      const barW = W * 0.8;
      const barH = 6;

      // Progress bar background
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 3);
      ctx.fill();

      // Progress bar fill
      const progressWidth = Math.min((prog / dur) * barW, barW);
      if (progressWidth > 0) {
        const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        barGrad.addColorStop(0, '#1DB954');
        barGrad.addColorStop(1, '#1ed760');
        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, progressWidth, barH, 3);
        ctx.fill();

        // Progress dot
        ctx.beginPath();
        ctx.arc(barX + progressWidth, barY + barH / 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      // Time text
      const formatT = (s: number) => {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
      };

      ctx.font = '16px Outfit, Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'left';
      ctx.fillText(formatT(prog), barX, barY + 28);
      ctx.textAlign = 'right';
      ctx.fillText(formatT(dur), barX + barW, barY + 28);

      // Play/Pause indicator (center bottom area)
      const iconY = barY + 55;
      const iconSize = 22;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';

      if (playing) {
        // Draw pause icon (two bars)
        const pauseW = 7;
        const pauseH = iconSize;
        const pauseGap = 8;
        ctx.fillRect(W / 2 - pauseGap - pauseW / 2, iconY - pauseH / 2, pauseW, pauseH);
        ctx.fillRect(W / 2 + pauseGap - pauseW / 2, iconY - pauseH / 2, pauseW, pauseH);
      } else {
        // Draw play icon (triangle)
        ctx.beginPath();
        ctx.moveTo(W / 2 - 10, iconY - 14);
        ctx.lineTo(W / 2 - 10, iconY + 14);
        ctx.lineTo(W / 2 + 14, iconY);
        ctx.closePath();
        ctx.fill();
      }

      // Prev/Next icons (skip back / skip forward)
      // Previous track icon
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      const prevX = W / 2 - 70;
      ctx.fillRect(prevX - 3, iconY - 10, 3, 20);
      ctx.beginPath();
      ctx.moveTo(prevX, iconY);
      ctx.lineTo(prevX + 14, iconY - 10);
      ctx.lineTo(prevX + 14, iconY + 10);
      ctx.closePath();
      ctx.fill();

      // Next track icon
      const nextX = W / 2 + 70;
      ctx.fillRect(nextX + 3, iconY - 10, 3, 20);
      ctx.beginPath();
      ctx.moveTo(nextX, iconY - 10);
      ctx.lineTo(nextX, iconY + 10);
      ctx.lineTo(nextX - 14, iconY);
      ctx.closePath();
      ctx.fill();

      pipAnimFrameRef.current = requestAnimationFrame(drawFrame);
    };

    pipAnimFrameRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (pipAnimFrameRef.current) {
        cancelAnimationFrame(pipAnimFrameRef.current);
      }
    };
  }, [isPiPActive, currentTrack, artistName]);

  // Update PiP media session position state
  useEffect(() => {
    if (!isPiPActive || !hasMounted) return;
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      const state = usePlayerStore.getState();
      const dur = state.duration;
      if (dur > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: 1,
            position: Math.min(state.progress, dur),
          });
        } catch (e) { /* ignore */ }
      }
    }
  }, [isPiPActive, progress, duration, hasMounted]);

  const togglePiP = async () => {
    if (!document.pictureInPictureEnabled) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (pipVideoRef.current && canvasRef.current) {
        const video = pipVideoRef.current;
        const canvas = canvasRef.current;

        // Ensure canvas has an initial frame drawn before we even start the stream
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#181818';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px Outfit, Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(currentTrack?.name || 'ZUTIFY', canvas.width / 2, canvas.height / 2);
        }

        // Initialize stream if not already done
        if (!video.srcObject) {
          const stream = canvas.captureStream(30);
          video.srcObject = stream;
        }

        // Must play the video element before requesting PiP
        try {
          await video.play();
        } catch (playError) {
          console.warn('PiP video play failed, might still work if metadata is loaded', playError);
        }

        // Wait for video to be ready (HAVE_METADATA or higher)
        // InvalidStateError occurs if we request PiP before metadata is loaded
        const waitForReady = () => new Promise<void>((resolve) => {
          if (video.readyState >= 1) {
            resolve();
          } else {
            const handleMetadata = () => {
              video.removeEventListener('loadedmetadata', handleMetadata);
              resolve();
            };
            video.addEventListener('loadedmetadata', handleMetadata);
            // Fallback timeout
            setTimeout(resolve, 1500);
          }
        });

        await waitForReady();

        // Final check: ensure we have metadata before calling requestPictureInPicture
        if (video.readyState < 1) {
          throw new Error('Video metadata failed to load in time');
        }

        setIsPiPActive(true);
        
        try {
          // Some browsers might still throw if tracks aren't active
          await video.requestPictureInPicture();
        } catch (e) {
          // If it fails, revert state
          setIsPiPActive(false);
          // Only log as warning to avoid the scary error overlay if it's a minor state issue
          console.warn('PiP request failed:', e);
        }
      }
    } catch (e) {
      console.warn('PiP general error:', e);
      setIsPiPActive(false);
    }
  };

  useEffect(() => {
    const handleExitPiP = () => {
      setIsPiPActive(false);
      if (pipAnimFrameRef.current) {
        cancelAnimationFrame(pipAnimFrameRef.current);
      }
    };
    const video = pipVideoRef.current;
    video?.addEventListener('leavepictureinpicture', handleExitPiP);
    return () => video?.removeEventListener('leavepictureinpicture', handleExitPiP);
  }, []);

  // Sync PiP video element play/pause with our player state
  // Chrome's PiP native button pauses/plays the <video> element directly.
  // We let the video element's state match our player state naturally,
  // so Chrome's PiP button icon correctly reflects play/pause.
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video || !isPiPActive) return;

    const onVideoPause = () => {
      // User clicked pause in PiP → sync our player state
      const state = usePlayerStore.getState();
      if (state.isPlaying) {
        setPlaying(false);
      }
      // Don't resume video — let it stay paused so PiP button icon updates correctly
    };

    const onVideoPlay = () => {
      // User clicked play in PiP → sync our player state
      const state = usePlayerStore.getState();
      if (!state.isPlaying) {
        setPlaying(true);
      }
    };

    video.addEventListener('pause', onVideoPause);
    video.addEventListener('play', onVideoPlay);
    return () => {
      video.removeEventListener('pause', onVideoPause);
      video.removeEventListener('play', onVideoPlay);
    };
  }, [isPiPActive, setPlaying]);

  const toast = usePlayerStore((state) => state.toast);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setProgress(newTime);
    if (!isLocal && playerRef.current) {
      playerRef.current.seekTo(newTime, true);
    } else if (isLocal && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };
  if (!hasMounted || !currentTrack) return null;

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 50, opacity: 0, x: '-50%' }}
            className={cn(
              "fixed bottom-32 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
              toast.type === 'success' && "bg-[#FA243C]/10 border-[#FA243C]/20 text-white",
              toast.type === 'error' && "bg-[#FA243C]/20 border-[#FA243C]/30 text-white",
              toast.type === 'info' && "bg-white/5 border-white/10 text-white"
            )}
          >
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hidden YouTube Player and PiP Helpers */}
      <div className="fixed top-[-1000px] left-[-1000px] w-[1px] h-[1px] opacity-0 pointer-events-none">
        {(!isLocal && currentTrack?.videoId && !currentTrack.videoId.startsWith('local-')) && (
          <YouTube
            key={currentTrack.videoId}
            videoId={currentTrack.videoId}
            opts={{
              height: '1',
              width: '1',
              playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                modestbranding: 1,
                rel: 0,
                origin: hasMounted ? window.location.origin : '',
              },
            }}
            onReady={onReady}
            onStateChange={onStateChange}
            onError={onError}
          />
        )}
        <canvas ref={canvasRef} width={640} height={800} />
        <video ref={pipVideoRef} muted playsInline />
        <audio ref={audioRef} onEnded={() => playNext()} />
      </div>

      {/* Mini Player */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[96px] md:bottom-[102px] left-1/2 -translate-x-1/2 w-[92%] max-w-md z-40 bg-[#121212]/95 backdrop-blur-md rounded-full flex items-center p-2 pr-3.5 cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden"
            onClick={() => setExpanded(true)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentTrack.videoId}-${currentTrack.name}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center flex-1 min-w-0 relative z-10"
              >
                {/* Circular Cover Art with Circular Progress Ring */}
                <div className="relative w-12 h-12 shrink-0 mr-3 flex items-center justify-center">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden shadow-lg">
                    <ImageWithFallback 
                      key={`mini-${currentTrack.videoId}-${thumbnail}`}
                      src={thumbnail} 
                      alt={currentTrack.name} 
                      fill 
                      sizes="36px" 
                      className="object-cover" 
                    />
                  </div>
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      className="text-white/10"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="transparent"
                      r="22"
                      cx="24"
                      cy="24"
                    />
                    <motion.circle
                      className="text-[#FA243C]"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="transparent"
                      r="22"
                      cx="24"
                      cy="24"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 22 - (duration > 0 ? (progress / duration) : 0) * 2 * Math.PI * 22 }}
                      transition={{ duration: 0.5, ease: "linear" }}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <MarqueeText text={currentTrack.name} className="text-white text-sm font-bold tracking-tight" />
                  <MarqueeText 
                    text={
                      <span className="flex items-center gap-1.5">
                        {currentTrack.isExplicit && <span className="bg-white/20 text-[8px] px-1 rounded-sm text-white font-black">E</span>}
                        {artistName}
                      </span>
                    } 
                    className="text-white/50 text-xs font-medium" 
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Circular Uniform Control Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 ml-2 relative z-10">
              {hasMounted && typeof document !== 'undefined' && document.pictureInPictureEnabled && (
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                  className={`w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center transition-all hover:bg-white/20 active:scale-90 ${isPiPActive ? 'text-[#FA243C]' : 'text-white/60 hover:text-white'}`}
                >
                  <PipIcon className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current text-white" /> : <Play className="w-4 h-4 fill-current text-white ml-0.5" />}
              </button>
              <button
                onClick={handleLike}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
              >
                <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-[#FA243C] text-[#FA243C]' : 'text-white'}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Player */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'tween', duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
            style={{
              background: '#050505'
            }}
          >
            <div className="relative z-10 flex flex-col h-full p-4 md:p-8 pb-6 md:pb-10 max-w-lg mx-auto w-full overflow-y-auto no-scrollbar scroll-smooth">
              {/* Header */}
              <div className="flex justify-between items-center mb-10">
                <button onClick={() => setExpanded(false)} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors bg-white/5 rounded-full">
                  <ChevronDown className="w-8 h-8" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Now Playing</span>
                <div className="flex items-center gap-1">
                  {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                      className={`p-2 transition-colors ${isPiPActive ? 'text-[#FA243C]' : 'text-white/50 hover:text-white'}`}
                    >
                      <PipIcon className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={handleLike} className="p-2 text-white/50 hover:text-white transition-colors">
                    <Heart className={cn("w-5 h-5", isLiked && "fill-[#FA243C] text-[#FA243C]")} />
                  </button>
                </div>
              </div>

              {/* Album Art or Lyrics */}
              <div className={cn("relative mb-8 shrink-0 flex flex-col justify-center", !showLyrics ? "h-[300px]" : "flex-1 min-h-[300px]")}>
                <AnimatePresence mode="wait">
                  {!showLyrics ? (
                    <motion.div
                      key={`art-${currentTrack.videoId}`}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: isPlaying ? 1 : 0.9, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                      className="w-full max-w-[280px] md:max-w-[360px] aspect-square rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] mx-auto relative group shrink-0"
                    >
                      <ImageWithFallback 
                        key={`expanded-${currentTrack.videoId}-${thumbnail}`}
                        src={thumbnail} 
                        alt={currentTrack.name} 
                        fill 
                        className="object-cover" 
                        priority 
                      />
                      <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:opacity-0" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`lyrics-${currentTrack.videoId}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="w-full h-full flex flex-col bg-black/30 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-6 overflow-hidden border border-white/10"
                    >
                      <h3 className="text-sm font-black uppercase tracking-widest text-[#FA243C] mb-4 shrink-0">Lyrics</h3>
                      <div 
                        ref={lyricsContainerRef}
                        className="flex-1 overflow-y-auto no-scrollbar space-y-5 pr-1 text-left scroll-smooth"
                      >
                        {lyrics && lyrics.length > 0 ? (
                          lyrics.map((line, i) => {
                            const isActive = i === activeLyricsIndex;
                            const isPassed = activeLyricsIndex !== -1 && i < activeLyricsIndex;
                            const isTimed = syncedLyrics && syncedLyrics.length > 0;
                            
                            return (
                              <div
                                key={i}
                                className="relative py-1 flex items-center justify-start min-h-[40px] group"
                              >
                                {isTimed && (
                                  <div
                                    className={cn(
                                      "absolute left-2 md:left-4 top-1/2 -translate-y-1/2 flex items-center transition-all duration-300",
                                      isActive ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-50 group-hover:scale-90"
                                    )}
                                  >
                                    {isActive ? (
                                      <span className="w-2.5 h-2.5 rounded-full bg-[#FA243C] animate-pulse shadow-[0_0_10px_#FA243C]" />
                                    ) : (
                                      <Play 
                                        className="w-3.5 h-3.5 text-white/50 fill-current cursor-pointer hover:text-white hover:scale-110" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (syncedLyrics[i] && syncedLyrics[i].time !== undefined) {
                                            const targetTime = syncedLyrics[i].time;
                                            setProgress(targetTime);
                                            if (!isLocal && playerRef.current) {
                                              playerRef.current.seekTo(targetTime, true);
                                            } else if (isLocal && audioRef.current) {
                                              audioRef.current.currentTime = targetTime;
                                            }
                                          }
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                                <p 
                                  data-lyrics-index={i}
                                  onClick={() => {
                                    if (syncedLyrics && syncedLyrics[i] && syncedLyrics[i].time !== undefined) {
                                      const targetTime = syncedLyrics[i].time;
                                      setProgress(targetTime);
                                      if (!isLocal && playerRef.current) {
                                        playerRef.current.seekTo(targetTime, true);
                                      } else if (isLocal && audioRef.current) {
                                        audioRef.current.currentTime = targetTime;
                                      }
                                    }
                                  }}
                                  className={cn(
                                    "text-lg md:text-2xl font-bold cursor-pointer lyric-line pl-8 pr-2 md:pl-12 md:pr-6 text-left",
                                    isActive 
                                      ? (isTimed ? "active-karaoke" : "active") 
                                      : isPassed 
                                        ? "passed" 
                                        : ""
                                  )}
                                >
                                  {isTimed ? (
                                    line.text.split(' ').map((word, wIdx) => (
                                      <span 
                                        key={wIdx} 
                                        className="lyric-word mr-1.5 inline-block"
                                        data-word-index={wIdx}
                                      >
                                        {word}
                                      </span>
                                    ))
                                  ) : (
                                    line.text
                                  )}
                                </p>
                              </div>
                            );
                          })
                        ) : lyrics === null ? (
                          <div className="h-full flex flex-col items-center justify-center text-white/40">
                            <div className="flex flex-col items-center gap-2">
                              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                              <span className="text-sm font-medium">Fetching lyrics...</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-white/40">
                            <span className="text-sm font-medium">Lyrics not available for this song</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Progress & Info */}
              <div className="mt-auto shrink-0 w-full">
                <div className="flex justify-between items-center mb-5">
                  <div className="min-w-0 flex-1 pr-6">
                    <MarqueeText text={currentTrack.name} className="text-2xl md:text-3xl font-extrabold text-white mb-1.5 tracking-tight" />
                    <MarqueeText text={artistName} className="text-base md:text-lg font-semibold text-white/50" />
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <button 
                      onClick={handleAddToPlaylist}
                      className="text-white/60 hover:text-white transition-all transform hover:scale-105 p-1"
                    >
                      <ListPlus className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={handleLike}
                      className="text-white/60 hover:text-white transition-all transform hover:scale-105 p-1"
                    >
                      <Heart className={cn("w-6 h-6 transition-all duration-300", isLiked ? "fill-[#FA243C] text-[#FA243C] scale-110" : "text-white/60")} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6 group relative">
                  <div className="relative h-1 w-full bg-white/20 rounded-full cursor-pointer">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-white rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
                      transition={{ duration: 0.5, ease: "linear" }}
                    />
                    <motion.div 
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md -ml-1.75 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity"
                      style={{ left: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
                      transition={{ duration: 0.5, ease: "linear" }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={progress || 0}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-white/50 mt-2 tracking-wide">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex justify-between items-center mb-6">
                  <button 
                    onClick={toggleShuffle}
                    className={cn("transition-all duration-300", isShuffle ? "text-[#FA243C] scale-110" : "text-white/30 hover:text-white")}
                  >
                    <Shuffle className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-8">
                    <button onClick={playPrev} className="text-white/80 hover:text-white transition-all transform hover:scale-110 active:scale-90">
                      <SkipBack className="w-10 h-10 fill-current" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="w-20 h-20 flex items-center justify-center bg-white text-black rounded-full hover:scale-110 active:scale-90 transition-all shadow-2xl shadow-white/10"
                    >
                      {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1.5" />}
                    </button>
                    <button onClick={playNext} className="text-white/80 hover:text-white transition-all transform hover:scale-110 active:scale-90">
                      <SkipForward className="w-10 h-10 fill-current" />
                    </button>
                  </div>
                  <button 
                    onClick={toggleRepeat}
                    className={cn("transition-all duration-300", repeatMode !== 'off' ? "text-[#FA243C] scale-110" : "text-white/30 hover:text-white")}
                  >
                    {repeatMode === 'one' ? <Repeat1 className="w-6 h-6" /> : <Repeat className="w-6 h-6" />}
                  </button>
                </div>

                {/* Bottom Actions */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: ListMusic, label: 'Up Next', onClick: () => {} },
                    { icon: Mic2, label: 'Lyrics', onClick: () => setShowLyrics(!showLyrics), active: showLyrics },
                    { icon: User, label: 'Artist', onClick: () => {
                      const artistId = Array.isArray(currentTrack.artist) ? currentTrack.artist[0]?.artistId : currentTrack.artist?.artistId;
                      if (artistId) { setExpanded(false); router.push(`/artist/${artistId}`); }
                    }}
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={btn.onClick}
                      className={cn(
                        "flex flex-col items-center gap-2 py-4 rounded-3xl transition-all border",
                        btn.active ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/40 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <btn.icon className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Love Popup */}
      {showLovePopup && currentTrack && (
        <LovePopup
          track={currentTrack}
          onClose={handleLovePopupClose}
        />
      )}
    </>
  );
}
