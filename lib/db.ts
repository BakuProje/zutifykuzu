import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Track } from './store';

export interface SavedAlbum {
  albumId: string;
  name: string;
  artist: string;
  thumbnails: { url: string; width: number; height: number }[];
  savedAt: number;
}

export interface SubscribedArtist {
  artistId: string;
  name: string;
  thumbnails: { url: string; width: number; height: number }[];
  subscribedAt: number;
}

export interface RecentSearch {
  query: string;
  timestamp: number;
}

export interface PinnedPlaylist {
  playlistId: string;
  pinnedAt: number;
}

interface SannMusicDB extends DBSchema {
  playlists: {
    key: string;
    value: {
      id: string;
      name: string;
      img: string;
      tracks: Track[];
    };
  };
  liked_songs: {
    key: string;
    value: Track;
  };
  uploaded_songs: {
    key: string;
    value: Track & { audioBlob?: Blob; uploadedAt: number };
  };
  downloaded_songs: {
    key: string;
    value: Track & { audioBlob: Blob; downloadedAt: number };
  };
  subscribed_artists: {
    key: string;
    value: SubscribedArtist;
  };
  saved_albums: {
    key: string;
    value: SavedAlbum;
  };
  recent_searches: {
    key: string;
    value: RecentSearch;
  };
  pinned_playlists: {
    key: string;
    value: PinnedPlaylist;
  };
}

let dbPromise: Promise<IDBPDatabase<SannMusicDB>>;

if (typeof window !== 'undefined') {
  dbPromise = openDB<SannMusicDB>('SannMusicDB', 6, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('liked_songs')) {
        db.createObjectStore('liked_songs', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('uploaded_songs')) {
        db.createObjectStore('uploaded_songs', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('downloaded_songs')) {
        db.createObjectStore('downloaded_songs', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('subscribed_artists')) {
        db.createObjectStore('subscribed_artists', { keyPath: 'artistId' });
      }
      if (!db.objectStoreNames.contains('saved_albums')) {
        db.createObjectStore('saved_albums', { keyPath: 'albumId' });
      }
      if (!db.objectStoreNames.contains('recent_searches')) {
        db.createObjectStore('recent_searches', { keyPath: 'query' });
      }
      if (!db.objectStoreNames.contains('pinned_playlists')) {
        db.createObjectStore('pinned_playlists', { keyPath: 'playlistId' });
      }
    },
  });
}

export const db = {
  async getPlaylists() {
    const db = await dbPromise;
    return db.getAll('playlists');
  },
  async addPlaylist(playlist: { id: string; name: string; img: string; tracks: Track[] }) {
    const db = await dbPromise;
    return db.put('playlists', playlist);
  },
  async getPlaylist(id: string) {
    if (!id) return null;
    const db = await dbPromise;
    return db.get('playlists', id);
  },
  async deletePlaylist(id: string) {
    if (!id) return;
    const db = await dbPromise;
    return db.delete('playlists', id);
  },
  async getLikedSongs() {
    const db = await dbPromise;
    return db.getAll('liked_songs');
  },
  async addLikedSong(track: Track) {
    const db = await dbPromise;
    return db.put('liked_songs', track);
  },
  async removeLikedSong(videoId: string) {
    if (!videoId) return;
    const db = await dbPromise;
    return db.delete('liked_songs', videoId);
  },
  async isLiked(videoId: string) {
    if (!videoId) return false;
    const db = await dbPromise;
    const song = await db.get('liked_songs', videoId);
    return !!song;
  },
  async getSubscribedArtists() {
    const db = await dbPromise;
    return db.getAll('subscribed_artists');
  },
  async addSubscribedArtist(artist: SubscribedArtist) {
    const db = await dbPromise;
    return db.put('subscribed_artists', artist);
  },
  async removeSubscribedArtist(artistId: string) {
    if (!artistId) return;
    const db = await dbPromise;
    return db.delete('subscribed_artists', artistId);
  },
  async isSubscribed(artistId: string) {
    if (!artistId) return false;
    const db = await dbPromise;
    const artist = await db.get('subscribed_artists', artistId);
    return !!artist;
  },
  async getSavedAlbums() {
    const db = await dbPromise;
    return db.getAll('saved_albums');
  },
  async addSavedAlbum(album: SavedAlbum) {
    const db = await dbPromise;
    return db.put('saved_albums', album);
  },
  async removeSavedAlbum(albumId: string) {
    if (!albumId) return;
    const db = await dbPromise;
    return db.delete('saved_albums', albumId);
  },
  async isAlbumSaved(albumId: string) {
    if (!albumId) return false;
    const db = await dbPromise;
    const album = await db.get('saved_albums', albumId);
    return !!album;
  },
  async getRecentSearches() {
    const db = await dbPromise;
    const searches = await db.getAll('recent_searches');
    return searches.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  },
  async addRecentSearch(query: string) {
    const db = await dbPromise;
    await db.put('recent_searches', { query, timestamp: Date.now() });
    
    // Keep only 20
    const searches = await db.getAll('recent_searches');
    if (searches.length > 20) {
      const sorted = searches.sort((a, b) => b.timestamp - a.timestamp);
      const toDelete = sorted.slice(20);
      const tx = db.transaction('recent_searches', 'readwrite');
      for (const item of toDelete) {
        tx.store.delete(item.query);
      }
      await tx.done;
    }
  },
  async removeRecentSearch(query: string) {
    if (!query) return;
    const db = await dbPromise;
    return db.delete('recent_searches', query);
  },
  async getUploadedSongs() {
    const db = await dbPromise;
    return db.getAll('uploaded_songs');
  },
  async addUploadedSong(track: Track & { audioBlob?: Blob; uploadedAt: number }) {
    const db = await dbPromise;
    return db.put('uploaded_songs', track);
  },
  async removeUploadedSong(videoId: string) {
    if (!videoId) return;
    const db = await dbPromise;
    return db.delete('uploaded_songs', videoId);
  },
  async getDownloadedSongs() {
    const db = await dbPromise;
    return db.getAll('downloaded_songs');
  },
  async addDownloadedSong(track: Track & { audioBlob: Blob; downloadedAt: number }) {
    const db = await dbPromise;
    return db.put('downloaded_songs', track);
  },
  async removeDownloadedSong(videoId: string) {
    if (!videoId) return;
    const db = await dbPromise;
    return db.delete('downloaded_songs', videoId);
  },
  async isDownloaded(videoId: string) {
    if (!videoId) return false;
    const db = await dbPromise;
    const song = await db.get('downloaded_songs', videoId);
    return !!song;
  },
  async getPinnedPlaylists() {
    const db = await dbPromise;
    const pinned = await db.getAll('pinned_playlists');
    return pinned.sort((a, b) => b.pinnedAt - a.pinnedAt);
  },
  async addPinnedPlaylist(playlistId: string) {
    const db = await dbPromise;
    return db.put('pinned_playlists', { playlistId, pinnedAt: Date.now() });
  },
  async removePinnedPlaylist(playlistId: string) {
    if (!playlistId) return;
    const db = await dbPromise;
    return db.delete('pinned_playlists', playlistId);
  },
  async isPinned(playlistId: string) {
    if (!playlistId) return false;
    const db = await dbPromise;
    const pinned = await db.get('pinned_playlists', playlistId);
    return !!pinned;
  },
};
