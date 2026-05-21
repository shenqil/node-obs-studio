'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BINARY_NAME   = 'obs_studio_client.node';
const BASE_GH_URL   = 'https://github.com/shenqil/node-obs-studio/releases/download';
const PROGRESS_COLS = 30;
const FETCH_TIMEOUT_MS = 180_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a semver string so the patch segment is always 0 (e.g. 1.1.5 → 1.1.0). */
function normaliseVersion(raw) {
  const match = raw.match(/^(\d+\.\d+\.)\d+(.*)$/);
  if (!match) throw new Error(`Invalid version string: "${raw}"`);
  return `${match[1]}0${match[2]}`;
}

/** Return a pretty progress bar string. */
function progressBar(received, total) {
  if (total <= 0) {
    return `${(received / 1_048_576).toFixed(2)} MB received`;
  }
  const pct    = received / total;
  const filled = Math.round(PROGRESS_COLS * pct);
  const bar    = '█'.repeat(filled) + '░'.repeat(PROGRESS_COLS - filled);
  const recMB  = (received / 1_048_576).toFixed(2);
  const totMB  = (total    / 1_048_576).toFixed(2);
  return `[${bar}] ${(pct * 100).toFixed(1)}% (${recMB}/${totMB} MB)`;
}

/** Write a file by consuming a WHATWG ReadableStream, with progress logging. */
async function streamToFile(readableStream, destPath, contentLength) {
  const writer = fs.createWriteStream(destPath);
  const reader = readableStream.getReader();
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      writer.write(value);
      received += value.length;
      process.stdout.write(`\r📥 [OBS] Downloading: ${progressBar(received, contentLength)}`);
    }
  } finally {
    reader.releaseLock();
  }

  // Wait for the write stream to fully flush before returning.
  await new Promise((resolve, reject) => {
    writer.end();
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  process.stdout.write('\n');
}

/** Extract a .tar.gz archive, skipping package.json, using the system tar. */
function extractTarGz(archivePath, destDir) {
  const args = [
    '-xzf', archivePath,
    '-C',   destDir,
    '--exclude=package.json',
  ];

  const result = spawnSync('tar', args, { stdio: 'inherit' });

  if (result.error) {
    throw new Error(`Failed to spawn tar: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`tar exited with code ${result.status}`);
  }
}

/** Remove a file if it exists, silently. */
function cleanUp(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const platform = process.platform; // darwin | win32 | linux
  const arch     = process.arch;     // x64 | arm64

  // 1. Locate and parse the host package.json
  const targetDir        = path.resolve(__dirname, '..');
  const pkgJsonPath      = path.join(targetDir, 'package.json');

  if (!fs.existsSync(pkgJsonPath)) {
    console.error('❌ [OBS] package.json not found at', pkgJsonPath);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  if (!pkg.version) {
    console.error('❌ [OBS] "version" field is missing in package.json.');
    process.exit(1);
  }

  const rawVersion = pkg.version;
  const version    = normaliseVersion(rawVersion); // patch → 0

  // 2. Fast-path: skip download if binary is already present
  const binaryPath = path.join(targetDir, BINARY_NAME);
  if (fs.existsSync(binaryPath)) {
    console.log(`✨ [OBS] Binary found at ${binaryPath}`);
    console.log(`🚀 [OBS] Cache hit for v${version}. Skipping download.`);
    return;
  }

  // 3. Validate platform support
  const SUPPORTED_PLATFORMS = ['darwin', 'win32', 'linux'];
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    console.error(`❌ [OBS] Unsupported platform: "${platform}"`);
    process.exit(1);
  }

  // 4. Build remote URL
  const filename    = `obs-studio-node-${platform}-${arch}.tar.gz`;
  const downloadUrl = `${BASE_GH_URL}/v${version}/${filename}`;
  const tempPath    = path.join(targetDir, filename);

  console.log(`💻 [OBS] Platform  : ${platform}-${arch}`);
  console.log(`📦 [OBS] Package   : v${rawVersion} → release v${version}`);
  console.log(`🚚 [OBS] Fetching  : ${downloadUrl}`);

  try {
    // 5. Fetch with timeout
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(downloadUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} — verify that release v${version} contains "${filename}".`
      );
    }

    const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);

    // 6. Stream to disk (awaits full flush before proceeding)
    await streamToFile(response.body, tempPath, contentLength);
    console.log('⏳ [OBS] Download complete. Extracting…');

    console.log('⏳ [OBS] Download complete. Waiting before extraction…');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('📂 [OBS] Extracting…');

    // 7. Extract (spawnSync avoids shell injection)
    extractTarGz(tempPath, targetDir);

    // 8. Cleanup
    cleanUp(tempPath);

    console.log(`🎉 [OBS] Success! Binaries v${version} are ready.`);

  } catch (err) {
    cleanUp(tempPath);
    console.error('\n❌ [OBS] Fatal error:', err.message ?? err);
    process.exit(1);
  }
}

main();