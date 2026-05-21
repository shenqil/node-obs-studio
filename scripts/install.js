const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function downloadAndUnzip() {
  const platform = process.platform; // win32, darwin, linux
  const arch = process.arch;         // x64, arm64
  
  // 1. Resolve paths
  const targetDir = path.join(__dirname, '../'); 
  const currentPkgJsonPath = path.join(targetDir, 'package.json');
  
  if (!fs.existsSync(currentPkgJsonPath)) {
    console.error('❌ [Error] Local package.json not found. Aborting.');
    process.exit(1);
  }

  // 2. Parse version from local host config
  const pkg = JSON.parse(fs.readFileSync(currentPkgJsonPath, 'utf8'));
  const rawVersion = pkg.version; // 比如：'1.0.1' 或 '1.1.1'
  
  if (!rawVersion) {
    console.error('❌ [Error] "version" field is missing in package.json.');
    process.exit(1);
  }

  // 💡 核心修复：使用正则将最后一位 Patch 版本号强行归零
  // 比如：1.0.1 -> 1.0.0 | 1.1.5 -> 1.1.0
  const version = rawVersion.replace(/^(\d+\.\d+\.)\d+$/, '$10');

  // Fast cache checker. Skip download if binary already exists
  const binaryCheckPath = path.join(targetDir, 'obs_studio_client.node');
  if (fs.existsSync(binaryCheckPath)) {
    console.log(`✨ [OBS] Binary asset detected at ${binaryCheckPath}`);
    console.log(`🚀 [OBS] Fresh cache found for v${version}. Skipping network download!`);
    process.exit(0);
  }

  // 3. Define remote assets urls using the formatted version
  // 此时请求的 tag 统一变成了：v1.0.0 或 v1.1.0
  const BASE_URL = `https://github.com/shenqil/node-obs-studio/releases/download/v${version}`;
  const filename = `obs-studio-node-${platform}-${arch}.zip`; 
  const downloadUrl = `${BASE_URL}/${filename}`;
  const tempZipPath = path.join(targetDir, filename);

  console.log(`💻 [OBS] Environment detected: ${platform}-${arch}`);
  console.log(`📦 [OBS] Npm Package Version: ${rawVersion}`);
  console.log(`🏷️  [OBS] Target Binary Release: v${version}`); // 会提示用户正在获取 1.0.0 或 1.1.0
  console.log(`🚚 [OBS] Fetching remote binary package from GitHub...`);

  try {
    // 4. High-fidelity progressive download with dynamic logs
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}. Please verify Release v${version} contains ${filename}`);
    }
    
    const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
    const reader = response.body.getReader();
    const writer = fs.createWriteStream(tempZipPath);
    
    let receivedBytes = 0;
    const progressBarLength = 30;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      writer.write(value);
      receivedBytes += value.length;

      if (totalBytes > 0) {
        const percentage = (receivedBytes / totalBytes) * 100;
        const filledLength = Math.round((progressBarLength * receivedBytes) / totalBytes);
        const bar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);
        
        const mbReceived = (receivedBytes / (1024 * 1024)).toFixed(2);
        const mbTotal = (totalBytes / (1024 * 1024)).toFixed(2);

        process.stdout.write(`📥 [OBS] Downloading: [${bar}] ${percentage.toFixed(1)}% (${mbReceived}/${mbTotal} MB)\r`);
      } else {
        const mbReceived = (receivedBytes / (1024 * 1024)).toFixed(2);
        process.stdout.write(`📥 [OBS] Downloading: ${mbReceived} MB received...\r`);
      }
    }
    writer.end();
    process.stdout.write('\n'); 
    console.log(`⏳ [OBS] Download completed. Extracting flat assets...`);

    // 5. Native direct extraction without structural layers
    if (platform === 'darwin') {
      execSync(`unzip -qo "${tempZipPath}" -d "${targetDir}" -x "package.json"`);
    } else if (platform === 'win32') {
      execSync(`tar -xf "${tempZipPath}" -C "${targetDir}" --exclude="package.json"`);
    } else {
      throw new Error(`Unsupported operating system configuration: ${platform}`);
    }

    // 6. Clean up temporary zip asset
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }

    console.log(`🎉 [OBS] SUCCESS! Core binaries v${version} integrated seamlessly.`);

  } catch (err) {
    console.error('\n❌ [OBS] CRITICAL EXCEPTION ENCOUNTERED:', err.message || err);
    if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
    process.exit(1);
  }
}

downloadAndUnzip();