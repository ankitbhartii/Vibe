import { Worker, Job } from 'bullmq';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = util.promisify(exec);

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/downloads';
const BEETS_CONFIG = process.env.BEETS_CONFIG || '/config/beets/config.yaml';

// Ensure base temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Recursively find all audio files in a directory
 */
function findAudioFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findAudioFiles(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.wma', '.opus'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

/**
 * Normalizes an audio file using ffmpeg-normalize or standard ffmpeg
 */
async function processAudioFile(filePath: string): Promise<void> {
  console.log(`Processing file: ${filePath}`);
  const ext = path.extname(filePath);
  const tempOutPath = filePath.replace(ext, `_temp_normalized${ext}`);
  
  try {
    // Attempt loudness normalization using ffmpeg-normalize (EBU R128)
    // If not installed, this will throw, and we fall back to standard ffmpeg normalizer/transcoder
    let codec = 'flac';
    if (ext === '.mp3') {
      codec = 'mp3';
    } else if (ext === '.m4a') {
      codec = 'aac';
    }
    console.log(`Normalizing volume for: ${path.basename(filePath)} using codec: ${codec}`);
    await execPromise(`ffmpeg-normalize "${filePath}" -o "${tempOutPath}" -c:a ${codec}`);
    
    // Replace original file with normalized one
    fs.renameSync(tempOutPath, filePath);
    console.log(`Successfully normalized: ${path.basename(filePath)}`);
  } catch (err: any) {
    console.warn(`ffmpeg-normalize failed, falling back to simple ffmpeg normalization: ${err.message}`);
    try {
      // Basic fallback: ffmpeg with loudnorm filter
      // If the file is FLAC, we want to keep it FLAC. If MP3, keep it MP3.
      let audioCodec = 'copy';
      if (ext === '.flac') {
        audioCodec = 'flac';
      } else if (ext === '.mp3') {
        audioCodec = 'libmp3lame';
      }
      
      const cmd = `ffmpeg -y -i "${filePath}" -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a ${audioCodec} "${tempOutPath}"`;
      await execPromise(cmd);
      
      fs.renameSync(tempOutPath, filePath);
      console.log(`Successfully normalized via fallback: ${path.basename(filePath)}`);
    } catch (fallbackErr: any) {
      console.error(`Standard FFmpeg normalization failed: ${fallbackErr.message}. Keeping source file.`);
      if (fs.existsSync(tempOutPath)) {
        fs.unlinkSync(tempOutPath);
      }
    }
  }
}

// Set up worker
const worker = new Worker(
  'download-queue',
  async (job: Job) => {
    const { url, source } = job.data;
    const jobId = job.id || 'unknown';
    const jobDir = path.join(TEMP_DIR, jobId);
    
    console.log(`\n==================================================`);
    console.log(`[Job ${jobId}] Started processing url: ${url}`);
    console.log(`[Job ${jobId}] Source detected: ${source}`);
    console.log(`==================================================`);
    
    // Create job-specific temp dir
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    
    try {
      // ────────────────────────────────────────────────────────
      // Step 1: Download Audio using appropriate CLI
      // ────────────────────────────────────────────────────────
      await job.updateProgress(10);
      console.log(`[Job ${jobId}] Initiating download command...`);
      
      let downloadCmd = '';
      if (source === 'jiosaavn') {
        const localPath = path.join(process.cwd(), '../saavn-cli/saavn-cli.py');
        if (fs.existsSync(localPath)) {
          downloadCmd = `python "${localPath}" download "${url}" --output "${jobDir}"`;
        } else {
          downloadCmd = `saavn-cli download "${url}" --output "${jobDir}"`;
        }
      } else if (source === 'tidal' || source === 'qobuz') {
        // Run streamrip (using executable command 'rip')
        // rip url <url> --path <dir>
        downloadCmd = `rip url "${url}" --path "${jobDir}"`;
      } else if (source === 'ytmusic') {
        // Run yt-dlp to download and extract audio in FLAC
        downloadCmd = `yt-dlp -x --audio-format flac --audio-quality 0 --yes-playlist --max-downloads 100 -o "${jobDir}/%(title)s.%(ext)s" "${url}"`;
      } else {
        throw new Error(`Unsupported source: ${source}`);
      }
      
      console.log(`[Job ${jobId}] Executing: ${downloadCmd}`);
      const downloadResult = await execPromise(downloadCmd);
      console.log(`[Job ${jobId}] Download Output:\n${downloadResult.stdout}`);
      if (downloadResult.stderr) {
        console.warn(`[Job ${jobId}] Download Warnings:\n${downloadResult.stderr}`);
      }
      
      // ────────────────────────────────────────────────────────
      // Step 2: Normalize Audio via FFmpeg
      // ────────────────────────────────────────────────────────
      await job.updateProgress(40);
      console.log(`[Job ${jobId}] Finding downloaded files in: ${jobDir}`);
      const audioFiles = findAudioFiles(jobDir);
      console.log(`[Job ${jobId}] Found ${audioFiles.length} audio file(s) for normalization`);
      
      if (audioFiles.length === 0) {
        throw new Error(`No audio files were downloaded. The CLI downloader might have failed or the URL is invalid.`);
      }
      
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        console.log(`[Job ${jobId}] Processing file [${i + 1}/${audioFiles.length}]`);
        await processAudioFile(file);
        
        const fileProgress = 40 + Math.round(((i + 1) / audioFiles.length) * 30); // 40% to 70%
        await job.updateProgress(fileProgress);
      }
      
      // ────────────────────────────────────────────────────────
      // Step 3: Run Beets Metadata Enrichment and Cataloging
      // ────────────────────────────────────────────────────────
      await job.updateProgress(75);
      console.log(`[Job ${jobId}] Running Beets to import and tag files...`);
      
      // Command to import:
      // beet -c <config> import --quiet --copy <dir>
      // We will copy/move the tagged tracks into the library path defined in the config.yaml (which is /music)
      const beetsCmd = `beet -c "${BEETS_CONFIG}" import -q "${jobDir}"`;
      console.log(`[Job ${jobId}] Executing: ${beetsCmd}`);
      
      const beetsResult = await execPromise(beetsCmd);
      console.log(`[Job ${jobId}] Beets Output:\n${beetsResult.stdout}`);
      if (beetsResult.stderr) {
        console.warn(`[Job ${jobId}] Beets Warnings:\n${beetsResult.stderr}`);
      }
      
      // ────────────────────────────────────────────────────────
      // Step 4: Cleanup
      // ────────────────────────────────────────────────────────
      await job.updateProgress(95);
      console.log(`[Job ${jobId}] Cleaning up temporary directory...`);
      if (fs.existsSync(jobDir)) {
        fs.rmSync(jobDir, { recursive: true, force: true });
      }
      
      await job.updateProgress(100);
      console.log(`[Job ${jobId}] Completed successfully!`);
      
      return {
        success: true,
        source,
        files_processed: audioFiles.length,
        message: `Successfully downloaded, normalized, and cataloged ${audioFiles.length} track(s).`
      };
      
    } catch (err: any) {
      console.error(`[Job ${jobId}] Error occurred:`, err.message);
      
      // Clean up temp dir on error to prevent disk clutter
      if (fs.existsSync(jobDir)) {
        try {
          fs.rmSync(jobDir, { recursive: true, force: true });
        } catch (cleanupErr) {
          console.error(`[Job ${jobId}] Failed to clean up temp dir:`, cleanupErr);
        }
      }
      
      throw err; // Fail the job in BullMQ
    }
  },
  {
    connection: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
    concurrency: 1, // Process 1 download at a time to prevent server/network overload
  }
);

worker.on('ready', () => {
  console.log(`🚀 BullMQ Worker is ready! Listening for jobs on connection: ${REDIS_HOST}:${REDIS_PORT}`);
});

worker.on('active', (job) => {
  console.log(`[Job ${job.id}] Active`);
});

worker.on('completed', (job, result) => {
  console.log(`[Job ${job.id}] Completed. Result:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`[Job ${job?.id}] Failed:`, err.message);
});

worker.on('error', (err) => {
  console.error(`🔥 Worker system error:`, err);
});
