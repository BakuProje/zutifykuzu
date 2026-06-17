import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getHighResImage(url: string | undefined, size = 800, id?: string) {
  if (!url) {
    const seed = id || Math.random().toString(36).substring(2, 8);
    return `https://picsum.photos/seed/${seed}/${size}/${size}`;
  }
  
  let finalUrl = url;
  if (url.startsWith('//')) {
    finalUrl = `https:${url}`;
  }

  // Handle YouTube/Google thumbnails
  if (finalUrl.includes('googleusercontent.com') || finalUrl.includes('ytimg.com') || finalUrl.includes('ggpht.com')) {
    // If it's a standard YouTube video thumbnail (i.ytimg.com/vi/ID/...)
    if (finalUrl.includes('ytimg.com/vi/')) {
       const videoIdMatch = finalUrl.match(/\/vi\/([^/]+)\//);
       if (videoIdMatch) {
         const videoId = videoIdMatch[1];
         // For music videos, maxresdefault is usually the one with the best quality.
         // If it's a song (Topic video), hqdefault is usually just the album art but low res.
         // We'll use hq720 if possible or maxresdefault for better resolution.
         return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
       }
    }
    
    let newUrl = finalUrl;
    
    // Handle w/h format
    if (newUrl.match(/[=/-]w\d+[=-]h\d+/)) {
      newUrl = newUrl.replace(/([=/-])w\d+(([=-])h\d+)/, (match, p1, p2, p3) => {
        return `${p1}w${size}${p3}h${size}`;
      });
    } 
    // Handle s format
    else if (newUrl.match(/[=/-]s\d+/)) {
      newUrl = newUrl.replace(/([=/-])s\d+/, `$1s${size}`);
    }
    // General googleusercontent size param
    else if (newUrl.includes('googleusercontent.com') && !newUrl.includes('=s') && !newUrl.includes('-s')) {
      newUrl = newUrl.includes('=') ? newUrl.replace(/=.*$/, `=s${size}`) : `${newUrl}=s${size}`;
    }

    return newUrl;
  }
  
  return finalUrl;
}

export function getBestThumbnail(thumbnails: { url: string; width: number; height: number }[] | undefined, size = 500, id?: string): string {
  if (!thumbnails || thumbnails.length === 0) {
    return getHighResImage(undefined, size, id);
  }
  
  // Find official Google Music / YouTube Music thumbnails first (most precise matching)
  const googleThumbnails = thumbnails.filter(t => 
    t.url.includes('googleusercontent.com') || 
    t.url.includes('ggpht.com')
  );
  
  if (googleThumbnails.length > 0) {
    // Pick the one closest to our requested size or the largest one
    const sorted = [...googleThumbnails].sort((a, b) => b.width - a.width);
    return getHighResImage(sorted[0].url, size, id);
  }

  // Fallback to iTunes thumbnails if no Google/YTMusic thumbnails are present
  const iTunesThumbnails = thumbnails.filter(t => 
    t.url.includes('mzstatic.com')
  );
  
  if (iTunesThumbnails.length > 0) {
    const sorted = [...iTunesThumbnails].sort((a, b) => b.width - a.width);
    return getHighResImage(sorted[0].url, size, id);
  }

  // Fallback to highest res available (usually YouTube video thumbnail)
  const sortedByRes = [...thumbnails].sort((a, b) => b.width - a.width);
  const bestBaseUrl = sortedByRes[0].url;

  return getHighResImage(bestBaseUrl, size, id);
}
