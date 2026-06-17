import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

function parseSyncedLyrics(lrc: string): { time: number; text: string }[] {
  const lines = lrc.split('\n');
  const parsed: { time: number; text: string }[] = [];
  
  for (const line of lines) {
    const match = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      const milliseconds = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();
      parsed.push({ time, text });
    }
  }
  
  return parsed.sort((a, b) => a.time - b.time);
}

async function fetchLrclibLyrics(artistName: string, trackName: string) {
  try {
    const url = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data: any = await res.json();
      if (data && data.length > 0) {
        return data[0];
      }
    }
  } catch (e) {}
  return null;
}

async function fetchLrclibLyricsWithFallback(artistName: string, trackName: string) {
  let lyrics = await fetchLrclibLyrics(artistName, trackName);
  if (!lyrics) {
    try {
      const query = `${artistName} ${trackName}`;
      const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        if (data && data.length > 0) {
          lyrics = data[0];
        }
      }
    } catch (e) {}
  }
  return lyrics;
}

export const dynamic = 'force-dynamic';

function cleanMetadata(artist: string, title: string): { artist: string; title: string } {
  let cleanTitle = title
    // Strip parenthesized/bracketed details like (Official Music Video), (Lyric Video), (Audio), (Live), (Visualizer), [MV]
    .replace(/\s*[\(\[][^)]*(?:official|video|music|audio|visualizer|clip|mv|lyric|lyrics|live|remastered)[^)]*[\)\]]/gi, '')
    // Strip featuring from title like (feat. Post Malone) or (ft. ...)
    .replace(/\s*[\(\[](?:feat|ft|featuring)\.?\s+[^)]+[\)\]]/gi, '')
    .trim();

  let cleanArtist = artist
    .replace(/\s*-\s*Topic$/gi, '')
    .replace(/VEVO$/gi, '')
    .trim();

  // Handle "Artist - Title" patterns in the song name
  if (cleanTitle.includes(' - ')) {
    const parts = cleanTitle.split(' - ');
    const firstPartNormalized = parts[0].toLowerCase().replace(/[\s\-_]/g, '');
    const artistNormalized = cleanArtist.toLowerCase().replace(/[\s\-_]/g, '');
    if (firstPartNormalized === artistNormalized || firstPartNormalized.includes(artistNormalized) || artistNormalized.includes(firstPartNormalized)) {
      cleanArtist = parts[0].trim();
      cleanTitle = parts.slice(1).join(' - ').trim();
    }
  }

  // If the title contains the artist's name (fallback if not split by dash)
  const artistLower = cleanArtist.toLowerCase();
  const titleLower = cleanTitle.toLowerCase();
  if (titleLower.includes(artistLower)) {
    const escapedArtist = cleanArtist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedArtist}\\s*[-\\s:]+\\s*`, 'i');
    cleanTitle = cleanTitle.replace(regex, '');
  }

  return { artist: cleanArtist, title: cleanTitle };
}

async function fetchYTMusicLyrics(id: string) {
  try {
    const watchPlaylistData = await (ytmusic as any).constructRequest('next', { videoId: id });
    let lyricsId = null;
    const tabs = watchPlaylistData?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
    
    if (tabs) {
      for (const tab of tabs) {
        const tabRenderer = tab.tabRenderer;
        if (tabRenderer?.endpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_TRACK_LYRICS") {
          lyricsId = tabRenderer.endpoint.browseEndpoint.browseId;
          break;
        }
      }
    }

    if (lyricsId) {
      const lyricsData = await (ytmusic as any).constructRequest('browse', { browseId: lyricsId });
      const runs = lyricsData?.contents?.sectionListRenderer?.contents?.[0]?.musicDescriptionShelfRenderer?.description?.runs;
      let lyricsText = null;
      
      if (runs) {
        lyricsText = runs.map((r: any) => r.text).join('');
      }
      
      if (lyricsText && !lyricsText.includes('Lyrics not available')) {
        const lyrics = lyricsText.replaceAll('\r', '').split('\n').filter((v: string) => !!v);
        return { lyrics, synced: null };
      }
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const queryTitle = searchParams.get('title') || '';
  const queryArtist = searchParams.get('artist') || '';
  
  if (!id || id.length !== 11) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  
  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }
    
    // 1. Get track info (either from query params or fetch it as fallback)
    let trackName = queryTitle;
    let artistName = queryArtist;
    
    if (!trackName || !artistName) {
      try {
        const songInfo = await ytmusic.getSong(id).catch(() => null);
        if (songInfo) {
          trackName = songInfo.name || '';
          if (songInfo.artist) {
            artistName = Array.isArray(songInfo.artist)
              ? songInfo.artist.map((a: any) => a.name).join(' ')
              : (songInfo.artist as any).name || '';
          }
        } else {
          const videoInfo = await ytmusic.getVideo(id).catch(() => null);
          if (videoInfo) {
            trackName = videoInfo.name || '';
            if (videoInfo.artist) {
              artistName = Array.isArray(videoInfo.artist)
                ? videoInfo.artist.map((a: any) => a.name).join(' ')
                : (videoInfo.artist as any).name || '';
            }
          }
        }
      } catch (e) {}
    }
    
    const { artist: cleanArtist, title: cleanTitle } = (trackName && artistName)
      ? cleanMetadata(artistName, trackName)
      : { artist: '', title: '' };

    // 2. Fetch from Lrclib (synced lyrics preference) and YTMusic in parallel to optimize speed
    const lrclibPromise = (cleanArtist && cleanTitle)
      ? fetchLrclibLyricsWithFallback(cleanArtist, cleanTitle)
      : Promise.resolve(null);
      
    const ytmusicPromise = fetchYTMusicLyrics(id);
    
    const [lrclibData, ytLyrics] = await Promise.all([
      lrclibPromise,
      ytmusicPromise
    ]);
    
    if (lrclibData) {
      let lyricsLines: string[] = [];
      let syncedLines: { time: number; text: string }[] | null = null;
      
      if (lrclibData.syncedLyrics) {
        syncedLines = parseSyncedLyrics(lrclibData.syncedLyrics);
        lyricsLines = syncedLines.map(line => line.text);
      } else if (lrclibData.plainLyrics) {
        lyricsLines = lrclibData.plainLyrics.replaceAll('\r', '').split('\n').filter((v: string) => !!v);
      }
      
      if (lyricsLines.length > 0) {
        return NextResponse.json({ lyrics: lyricsLines, synced: syncedLines }, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        });
      }
    }
    
    if (ytLyrics) {
      return NextResponse.json(ytLyrics, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }
    
    return NextResponse.json({ lyrics: null, synced: null }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ lyrics: null, synced: null });
    }
    console.error(`Lyrics error for id ${id}:`, error?.message || error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
