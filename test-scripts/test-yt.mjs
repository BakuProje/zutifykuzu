import { Innertube } from 'youtubei.js';
import fs from 'fs';

async function test() {
  const videoId = 'BLm3kDMBXDE'; // The video ID
  
  try {
    console.log("Creating Innertube instance...");
    const yt = await Innertube.create();
    
    console.log("Downloading stream via yt.download with type: 'audio' and quality: 'best'...");
    
    const stream = await yt.download(videoId, {
      type: 'audio',
      quality: 'best'
    });
    
    console.log("Stream class:", stream.constructor.name);
    
    const file = fs.createWriteStream('./test-out.mp4');
    
    // Check if it's a web ReadableStream
    if (typeof stream.pipe === 'function') {
      stream.pipe(file);
    } else {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        file.write(value);
      }
      file.end();
    }
    
    console.log("Successfully downloaded stream chunk!");
  } catch (e) {
    console.error("Error:", e.message || e);
  }
}

test();
