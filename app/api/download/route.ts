import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

async function downloadYtDlp(dest: string) {
  const res = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe');
  if (!res.ok) throw new Error(`Failed to download yt-dlp: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buffer));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('id');
  const name = searchParams.get('name') || 'track';

  if (!videoId || videoId.length !== 11) {
    return NextResponse.json({ error: 'Invalid or missing YouTube Video ID' }, { status: 400 });
  }

  const binDir = path.join(process.cwd(), '.bin');
  const ytDlpPath = path.join(binDir, 'yt-dlp.exe');

  try {
    // Check and auto-download yt-dlp.exe if missing
    if (!fs.existsSync(ytDlpPath)) {
      if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
      }
      await downloadYtDlp(ytDlpPath);
    }

    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Run yt-dlp to get the direct deciphered stream URL
    const streamUrl = await new Promise<string>((resolve, reject) => {
      execFile(
        ytDlpPath, 
        ['-g', '-f', 'ba[ext=m4a]/ba', '--no-playlist', '--no-warnings', '--no-check-formats', '--no-check-certificate', ytUrl], 
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
            return;
          }
          resolve(stdout.trim());
        }
      );
    });

    if (!streamUrl) {
      return NextResponse.json({ error: 'Could not resolve stream URL' }, { status: 404 });
    }

    const streamResponse = await fetch(streamUrl);
    if (!streamResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch audio stream from YouTube source' }, { status: 500 });
    }

    const headers = new Headers();
    const safeName = name.replace(/[^\w\s\-\.]/gi, '').trim() || 'track';
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}.mp3"`);
    headers.set('Content-Type', 'audio/mpeg');
    
    const contentLength = streamResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(streamResponse.body, {
      headers
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to download track' }, { status: 500 });
  }
}
