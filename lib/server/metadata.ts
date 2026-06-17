import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'metadata_cache.json');
let coverCache = new Map<string, string>();

// Load cache from file
try {
  if (fs.existsSync(CACHE_FILE)) {
    const rawData = fs.readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(rawData);
    coverCache = new Map(Object.entries(data));
  }
} catch (e) {
  console.error('Failed to load metadata cache:', e);
}

// Function to save cache to file
function saveCache() {
  try {
    const obj = Object.fromEntries(coverCache.entries());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save metadata cache:', e);
  }
}

async function fetchiTunesCover(artistName: string, trackName: string): Promise<string | null> {
  const cleanArtist = artistName.replace(/\s+/g, ' ').trim();
  const cleanTrack = trackName.replace(/\s+/g, ' ').trim();
  const cacheKey = `${cleanArtist.toLowerCase()}:${cleanTrack.toLowerCase()}`;
  
  if (coverCache.has(cacheKey)) {
    return coverCache.get(cacheKey)!;
  }
  
  // Stagger request bursts to avoid rate-limiting (0 to 1.5 seconds delay)
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1500));
  
  const rawQuery = `${cleanArtist} ${cleanTrack}`;
  // Clean query string from featuring abbreviations (ft, feat, featuring)
  const cleanQuery = rawQuery
    .replace(/\b(feat|ft|featuring)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&limit=5&entity=song`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout
    
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data: any = await res.json();
      if (data.results && data.results.length > 0) {
        for (const result of data.results) {
          const resultArtist = result.artistName || '';
          const resultTrack = result.trackName || '';
          
          // Cleaner that strips featuring prepositions and symbols
          const cleanStr = (s: string) => s.toLowerCase()
            .replace(/\b(feat|ft|featuring)\b/g, '')
            .replace(/[^a-z0-9]/g, '');
            
          const cleanArtistInput = cleanStr(artistName);
          const cleanArtistResult = cleanStr(resultArtist);
          const cleanTrackInput = cleanStr(trackName);
          const cleanTrackResult = cleanStr(resultTrack);
          
          const artistMatches = 
            cleanArtistResult.includes(cleanArtistInput) || 
            cleanArtistInput.includes(cleanArtistResult) ||
            cleanTrackResult.includes(cleanArtistInput); // E.g. featuring artist is in track title
            
          const trackMatches = cleanTrackResult.includes(cleanTrackInput) || cleanTrackInput.includes(cleanTrackResult);
          
          if (artistMatches && trackMatches) {
            let artworkUrl = result.artworkUrl100;
            if (artworkUrl) {
              // Replace with high resolution 800x800
              artworkUrl = artworkUrl.replace('100x100bb.jpg', '800x800bb.jpg');
              coverCache.set(cacheKey, artworkUrl);
              saveCache();
              return artworkUrl;
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore error or timeout, fallback to default
  }
  
  return null;
}

export async function enrichTrack(track: any) {
  if (!track || !track.name) return track;
  
  // Extract artist name safely
  let artistName = '';
  if (track.artist) {
    if (Array.isArray(track.artist)) {
      artistName = track.artist.map((a: any) => a.name).join(' ');
    } else if (typeof track.artist === 'object') {
      artistName = track.artist.name || '';
    } else if (typeof track.artist === 'string') {
      artistName = track.artist;
    }
  }
  
  if (!artistName) return track;

  // If track already has valid thumbnails, check if they are generic YouTube video thumbnails.
  // We only run iTunes lookup if it's a generic YouTube video thumbnail (e.g. ytimg.com or /vi/)
  // to avoid incorrect overrides of proper official music release album covers.
  if (track.thumbnails && track.thumbnails.length > 0 && track.thumbnails[0].url) {
    const isGenericYT = track.thumbnails[0].url.includes('ytimg.com') || track.thumbnails[0].url.includes('/vi/');
    if (!isGenericYT) {
      return track;
    }
  }
  
  // Parse title if it's a standard "Artist - Title" format
  let searchArtist = artistName;
  let searchTitle = track.name;
  if (track.name.includes(' - ')) {
    const parts = track.name.split(' - ');
    const potentialArtist = parts[0].trim();
    let potentialTitle = parts.slice(1).join(' - ').trim();
    
    // Clean up title (remove common video suffixes)
    potentialTitle = potentialTitle
      .replace(/\s*[\(\[][^)]*(lyrics|official|video|audio|lirik|remix|cover)[^)]*[\)\]]/gi, '')
      .replace(/\s*(lyrics|official video|official audio|official lyrics|lirik video|video lirik|lyric video|lyrics video|audio)\s*/gi, '')
      .trim();
      
    if (potentialArtist && potentialTitle) {
      searchArtist = potentialArtist;
      searchTitle = potentialTitle;
    }
  }
  
  const coverUrl = await fetchiTunesCover(searchArtist, searchTitle);
  if (coverUrl) {
    if (!track.thumbnails) {
      track.thumbnails = [];
    }
    // Check if coverUrl is already present in thumbnails
    const exists = track.thumbnails.some((t: any) => t.url === coverUrl);
    if (!exists) {
      // Prepend to thumbnails and set large width/height so getBestThumbnail chooses it
      track.thumbnails.unshift({
        url: coverUrl,
        width: 1000,
        height: 1000
      });
    }
  }
  
  return track;
}

export async function enrichTracks(tracks: any[]) {
  if (!tracks || tracks.length === 0) return tracks;
  // Resolve concurrently
  await Promise.allSettled(tracks.map(track => enrichTrack(track)));
  return tracks;
}
