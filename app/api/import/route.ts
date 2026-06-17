import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';
import { enrichTrack } from '@/lib/server/metadata';

const ytmusic = new YTMusic();
let initialized = false;

// Extract parameter from URL query string
function getQueryParam(urlStr: string, param: string): string | null {
  try {
    const url = new URL(urlStr);
    return url.searchParams.get(param);
  } catch (e) {
    return null;
  }
}

// Extract YouTube/YTMusic video ID
function extractYoutubeVideoId(url: string): string | null {
  // Regex to match video ID: 11 characters
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
}

// Extract YouTube/YTMusic playlist ID
function extractYoutubePlaylistId(url: string): string | null {
  return getQueryParam(url, 'list');
}

// Extract Spotify track ID
function extractSpotifyTrackId(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// Extract Spotify playlist ID
function extractSpotifyPlaylistId(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }

    // Check if Spotify link
    const spotifyTrackId = extractSpotifyTrackId(targetUrl);
    if (spotifyTrackId) {
      // 1. Fetch metadata from Spotify oembed
      const spotifyOembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`;
      const oembedRes = await fetch(spotifyOembedUrl);
      if (!oembedRes.ok) {
        return NextResponse.json({ error: 'Spotify track not found or metadata lookup failed' }, { status: 400 });
      }

      const oembedData: any = await oembedRes.json();
      const title = oembedData.title || '';
      const artist = oembedData.author_name || '';
      const thumbnailUrl = oembedData.thumbnail_url || '';

      if (!title) {
        return NextResponse.json({ error: 'Could not extract title from Spotify track' }, { status: 400 });
      }

      // 2. Search for the track on YouTube Music
      const searchQuery = `${title} ${artist}`;
      const searchResults = await ytmusic.searchSongs(searchQuery).catch(() => []);
      
      let matchedTrack = null;
      if (searchResults.length > 0) {
        matchedTrack = searchResults[0];
      } else {
        // Fallback to video search
        const videoResults = await ytmusic.searchVideos(searchQuery).catch(() => []);
        if (videoResults.length > 0) {
          matchedTrack = videoResults[0];
        }
      }

      if (!matchedTrack) {
        return NextResponse.json({ error: `Spotify track resolved, but could not find a matching track on YouTube Music for: ${title} - ${artist}` }, { status: 404 });
      }

      // 3. Construct Track object
      // Use higher res image if available, fallback to Spotify's thumbnail
      const finalTrack = {
        videoId: matchedTrack.videoId,
        name: matchedTrack.name || title,
        artist: matchedTrack.artist || { name: artist },
        thumbnails: matchedTrack.thumbnails && matchedTrack.thumbnails.length > 0
          ? matchedTrack.thumbnails
          : [{ url: thumbnailUrl, width: 300, height: 300 }],
        duration: matchedTrack.duration,
      };

      // Enrich with iTunes high-res artwork if possible
      const enriched = await enrichTrack(finalTrack).catch(() => finalTrack);

      return NextResponse.json({ type: 'song', track: enriched });
    }

    // Check if Spotify playlist link
    const spotifyPlaylistId = extractSpotifyPlaylistId(targetUrl);
    if (spotifyPlaylistId) {
      const spotifyUrl = `https://open.spotify.com/embed/playlist/${spotifyPlaylistId}`;
      const res = await fetch(spotifyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch Spotify playlist embed page' }, { status: 400 });
      }
      const html = await res.text();
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (!nextDataMatch) {
        return NextResponse.json({ error: 'Failed to parse Spotify playlist page data' }, { status: 400 });
      }

      const data = JSON.parse(nextDataMatch[1]);
      const entity = data.props?.pageProps?.state?.data?.entity;
      if (!entity) {
        return NextResponse.json({ error: 'Spotify playlist data is empty' }, { status: 400 });
      }

      const trackList = entity.trackList || [];
      // Resolve up to 50 tracks in parallel
      const resolvedTracks = await Promise.allSettled(
        trackList.slice(0, 50).map(async (track: any) => {
          const title = track.title;
          const artist = track.subtitle?.replace(/\u00a0/g, ' ').trim() || '';
          const searchQuery = `${title} ${artist}`;
          const searchResults = await ytmusic.searchSongs(searchQuery).catch(() => []);
          
          let matched = null;
          if (searchResults.length > 0) {
            matched = searchResults[0];
          } else {
            const videoResults = await ytmusic.searchVideos(searchQuery).catch(() => []);
            if (videoResults.length > 0) {
              matched = videoResults[0];
            }
          }
          
          if (matched) {
            return {
              videoId: matched.videoId,
              name: matched.name || title,
              artist: matched.artist || { name: artist },
              thumbnails: matched.thumbnails && matched.thumbnails.length > 0
                ? matched.thumbnails
                : (entity.coverArt?.sources?.[0]?.url 
                    ? [{ url: entity.coverArt.sources[0].url, width: 300, height: 300 }]
                    : []),
              duration: matched.duration || Math.round(track.duration / 1000),
            };
          }
          return null;
        })
      );

      const tracks = resolvedTracks
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      return NextResponse.json({
        type: 'playlist',
        playlist: {
          id: entity.id || spotifyPlaylistId,
          name: entity.name || 'Spotify Playlist',
          img: entity.coverArt?.sources?.[0]?.url || 'https://picsum.photos/seed/playlist/200/200',
          tracks: tracks
        }
      });
    }

    // Check if YouTube/YTMusic link
    const isYoutube = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');
    if (isYoutube) {
      const playlistId = extractYoutubePlaylistId(targetUrl);
      const videoId = extractYoutubeVideoId(targetUrl);

      // Heuristic: If videoId exists, treat it as a single song import even if it has list= (queue context)
      if (videoId) {
        // Fetch song metadata
        let songInfo = await ytmusic.getSong(videoId).catch(() => null) as any;
        if (!songInfo) {
          songInfo = await ytmusic.getVideo(videoId).catch(() => null) as any;
        }

        if (!songInfo) {
          return NextResponse.json({ error: 'Failed to fetch YouTube song details. The video may be private or restricted.' }, { status: 404 });
        }

        const track = {
          videoId: songInfo.videoId,
          name: songInfo.name,
          artist: songInfo.artist || { name: 'Unknown Artist' },
          thumbnails: songInfo.thumbnails || [],
          duration: songInfo.duration,
        };

        const enriched = await enrichTrack(track).catch(() => track);
        return NextResponse.json({ type: 'song', track: enriched });
      } else if (playlistId) {
        // Fetch playlist metadata
        let playlistData = await ytmusic.getPlaylist(playlistId).catch(() => null) as any;
        let videos = [];

        if (playlistData) {
          videos = playlistData.videos || [];
          if (videos.length === 0) {
            try {
              videos = await ytmusic.getPlaylistVideos(playlistId);
            } catch (e) {
              console.error('Failed to get playlist videos:', e);
            }
          }
        } else {
          // Try fetching as album if playlist failed
          const album = await ytmusic.getAlbum(playlistId).catch(() => null) as any;
          if (album) {
            playlistData = {
              playlistId: album.albumId,
              name: album.name,
              thumbnails: album.thumbnails,
            };
            videos = album.songs.map((song: any) => ({
              videoId: song.videoId,
              name: song.name,
              artist: song.artist || [album.artist],
              duration: song.duration,
              thumbnails: song.thumbnails || album.thumbnails,
            }));
          }
        }

        if (!playlistData) {
          return NextResponse.json({ error: 'Playlist/Album not found or is private' }, { status: 404 });
        }

        const tracks = (videos || []).map((v: any) => ({
          videoId: v.videoId,
          name: v.name,
          artist: v.artist || { name: 'Unknown Artist' },
          thumbnails: v.thumbnails || [],
          duration: v.duration,
        }));

        return NextResponse.json({
          type: 'playlist',
          playlist: {
            id: playlistData.playlistId || playlistId,
            name: playlistData.name || 'Imported Playlist',
            img: playlistData.thumbnails?.[0]?.url || 'https://picsum.photos/seed/playlist/200/200',
            tracks: tracks
          }
        });
      }
    }

    return NextResponse.json({ error: 'Unsupported URL format. Please paste a valid Spotify track link, YouTube Music song, or YouTube/YTMusic playlist link.' }, { status: 400 });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
