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
 * Normalizes an audio file using ffmpeg (EBU R128 loudness, silence trim, transcode to FLAC)
 */
async function processAudioFile(filePath: string, jobDir: string): Promise<string> {
  console.log(`Processing file: ${filePath}`);
  const ext = path.extname(filePath).toLowerCase();
  
  const flacPath = filePath.replace(ext, '.flac');
  const tempOutPath = filePath.replace(ext, `_temp_normalized.flac`);
  
  try {
    // EBU R128 Loudness Normalization + Trim silence at start/end
    const ffmpegFilter = 'loudnorm=I=-16:LRA=11:TP=-1.5,silenceremove=start_threshold=-50dB:start_duration=0.1:start_silence=0.1:end_threshold=-50dB:end_duration=0.1:end_silence=0.1';
    
    console.log(`Transcoding, normalizing and trimming: ${path.basename(filePath)} -> ${path.basename(flacPath)}`);
    const cmd = `ffmpeg -y -i "${filePath}" -af "${ffmpegFilter}" -c:a flac "${tempOutPath}"`;
    await execPromise(cmd);
    
    // Extract cover art to JPEG if present in original audio file
    try {
      const artPath = path.join(jobDir, 'cover.jpg');
      if (!fs.existsSync(artPath)) {
        console.log(`Extracting cover art to JPEG...`);
        await execPromise(`ffmpeg -y -i "${filePath}" -an -codec:v copy "${artPath}"`);
      }
    } catch (artErr: any) {
      // Audio might not contain embedded cover art; ignore
    }
    
    // Replace original file with the new normalized FLAC file
    if (filePath !== flacPath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (fs.existsSync(tempOutPath)) {
      fs.renameSync(tempOutPath, flacPath);
    }
    
    console.log(`Successfully processed: ${path.basename(flacPath)}`);
    return flacPath;
  } catch (err: any) {
    console.error(`FFmpeg processing failed for ${filePath}: ${err.message}`);
    if (fs.existsSync(tempOutPath)) {
      fs.unlinkSync(tempOutPath);
    }
    return filePath;
  }
}

// Job handler shared across all worker instances
const jobHandler = async (job: Job) => {
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
    } else if (source === 'tidal' || source === 'qobuz' || source === 'soundcloud') {
      // Run streamrip (using executable command 'rip')
      downloadCmd = `rip url "${url}" --path "${jobDir}"`;
    } else if (source === 'ytmusic') {
      // Load cookies.txt if it exists in expected directories
      let cookiesArg = '';
      const cookiePaths = [
        '/config/cookies.txt',
        '/config/beets/cookies.txt',
        './cookies.txt',
        '/app/cookies.txt'
      ];
      for (const p of cookiePaths) {
        if (fs.existsSync(p)) {
          cookiesArg = `--cookies "${p}"`;
          console.log(`[Job ${jobId}] Loading YouTube cookies from: ${p}`);
          break;
        }
      }
      
      // Premium cookies unlock high-bitrate OPUS -> Transcode to FLAC via yt-dlp
      downloadCmd = `yt-dlp -x --audio-format flac --audio-quality 0 --extractor-args "youtube:player_client=web_music" ${cookiesArg} --yes-playlist --max-downloads 100 -o "${jobDir}/%(title)s.%(ext)s" "${url}"`;
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
    // Step 2: Normalize & Transcode Audio via FFmpeg
    // ────────────────────────────────────────────────────────
    await job.updateProgress(40);
    console.log(`[Job ${jobId}] Finding downloaded files in: ${jobDir}`);
    const audioFiles = findAudioFiles(jobDir);
    console.log(`[Job ${jobId}] Found ${audioFiles.length} audio file(s) for normalization`);
    
    if (audioFiles.length === 0) {
      throw new Error(`No audio files were downloaded. The CLI downloader might have failed or the URL is invalid.`);
    }
    
    const processedFiles: string[] = [];
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      console.log(`[Job ${jobId}] Processing file [${i + 1}/${audioFiles.length}]`);
      const flacFile = await processAudioFile(file, jobDir);
      processedFiles.push(flacFile);
      
      const fileProgress = 40 + Math.round(((i + 1) / audioFiles.length) * 30); // 40% to 70%
      await job.updateProgress(fileProgress);
    }
    
    // ────────────────────────────────────────────────────────
    // Step 3: Run Beets Metadata Enrichment and Cataloging
    // ────────────────────────────────────────────────────────
    await job.updateProgress(75);
    console.log(`[Job ${jobId}] Running Beets to import and tag files...`);
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
      files_processed: processedFiles.length,
      message: `Successfully downloaded, normalized, and cataloged ${processedFiles.length} track(s).`
    };
    
  } catch (err: any) {
    console.error(`[Job ${jobId}] Error occurred:`, err.message);
    if (fs.existsSync(jobDir)) {
      try {
        fs.rmSync(jobDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error(`[Job ${jobId}] Failed to clean up temp dir:`, cleanupErr);
      }
    }
    throw err;
  }
};

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
};

// Set up worker instances for multiple queues (General, YT Music, SoundCloud)
const generalWorker = new Worker('download-queue', jobHandler, { connection, concurrency: 1 });
const ytmusicWorker = new Worker('queue:ytmusic', jobHandler, { connection, concurrency: 5 });
const soundcloudWorker = new Worker('queue:soundcloud', jobHandler, { connection, concurrency: 3 });

const setupListeners = (workerInstance: Worker, name: string) => {
  workerInstance.on('ready', () => {
    console.log(`🚀 BullMQ Worker [${name}] is ready! Listening for jobs on connection: ${REDIS_HOST}:${REDIS_PORT}`);
  });
  
  workerInstance.on('active', (job) => {
    console.log(`[Job ${job.id}] [${name}] Active`);
  });
  
  workerInstance.on('completed', (job, result) => {
    console.log(`[Job ${job.id}] [${name}] Completed. Result:`, result);
  });
  
  workerInstance.on('failed', (job, err) => {
    console.error(`[Job ${job?.id}] [${name}] Failed:`, err.message);
  });
  
  workerInstance.on('error', (err) => {
    console.error(`🔥 Worker [${name}] system error:`, err);
  });
};

setupListeners(generalWorker, 'General');
setupListeners(ytmusicWorker, 'YTMusic');
setupListeners(soundcloudWorker, 'SoundCloud');

