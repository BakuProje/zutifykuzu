import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';
import { enrichTracks } from '@/lib/server/metadata';

const ytmusic = new YTMusic();
let initialized = false;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || id === 'undefined' || id === 'null') {
    return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
  }

  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }
    try {
      const playlist = await ytmusic.getPlaylist(id) as any;
      let videos = playlist.videos || [];
      if (videos.length === 0) {
        try {
          videos = await ytmusic.getPlaylistVideos(id);
        } catch (e) {
          console.error('Failed to get playlist videos:', e);
        }
      }
      await enrichTracks(videos);
      return NextResponse.json({
        ...playlist,
        videos: videos
      });
    } catch (e: any) {
      if (e?.name === 'ZodError') {
        // Suppress ZodError logs
      } else if (e?.message?.includes('split')) {
        // Suppress known split error for invalid playlist IDs
      } else {
        console.error('getPlaylist error:', e);
        console.log(`getPlaylist failed for id ${id}, trying getAlbum`);
      }
      
      const album = await ytmusic.getAlbum(id);
      // Map album to playlist format
      const albumVideos = album.songs.map((song: any) => ({
        videoId: song.videoId,
        name: song.name,
        artist: song.artist || [album.artist],
        duration: song.duration,
        thumbnails: song.thumbnails || album.thumbnails,
      }));
      await enrichTracks(albumVideos);
      return NextResponse.json({
        playlistId: album.albumId,
        name: album.name,
        artist: album.artist,
        thumbnails: album.thumbnails,
        videos: albumVideos
      });
    }
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'ZodError', details: error.issues }, { status: 500 });
    }
    
    // Suppress 400 errors as they just mean the ID is invalid
    if (error?.isAxiosError && error?.response?.status === 400) {
      return NextResponse.json({ error: 'Invalid playlist/album ID' }, { status: 400 });
    }
    
    console.error(`Error fetching playlist/album for id ${id}:`, error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: 500 });
  }
}
