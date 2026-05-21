const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function downloadAndUnzip() {
  const platform = process.platform; // win32, darwin
  const arch = process.arch;         // x64, arm64
  
  // 1. 定位并读取当前的 package.json
  const targetDir = path.join(__dirname, '../'); // 当前包的根目录
  const currentPkgJsonPath = path.join(targetDir, 'package.json');
  
  if (!fs.existsSync(currentPkgJsonPath)) {
    console.error('❌ 错误：未找到本地 package.json，无法获取当前版本号。');
    process.exit(1);
  }

  // 2. 动态解析版本号
  const pkg = JSON.parse(fs.readFileSync(currentPkgJsonPath, 'utf8'));
  const version = pkg.version; // 例如拿到 "1.0.1"
  
  if (!version) {
    console.error('❌ 错误：本地 package.json 中未配置 version 字段。');
    process.exit(1);
  }

  // 3. 动态拼接基于当前版本的 GitHub Release 下载直链
  const BASE_URL = `https://github.com/shenqil/node-obs-studio/releases/download/v${version}`;
  const PROXY_URL = ''; // 國內機器可在此配置加速代理前綴，如 'https://ghproxy.com/'
  
  const filename = `obs-node-${platform}-${arch}.zip`;
  const downloadUrl = `${PROXY_URL}${BASE_URL}/${filename}`;
  const tempZipPath = path.join(targetDir, filename);

  console.log(`🔍 [OBS 部署] 当前环境: ${platform}-${arch}`);
  console.log(`🏷️  [解析版本] 成功获取本地版本号: v${version}`);
  console.log(`🚚 正在从 GitHub 下载专属 ZIP 包: ${downloadUrl}`);

  try {
    // 4. 发起网络请求下载 ZIP 文件
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`GitHub 资源请求失败! 状态码: ${response.status}。请确保 Release v${version} 下存在文件: ${filename}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempZipPath, Buffer.from(arrayBuffer));
    console.log(`⬇️  ZIP 临时包下载完成，正在解压...`);

    // 5. 调用系统命令平铺解压，并利用底层参数直接剔除、不解压包内的 package.json
    console.log(`📦 正在平铺解压文件，自动跳过网络包内的 package.json...`);
    
    if (platform === 'darwin') {
      // macOS 使用 unzip，-x 排除 package.json
      execSync(`unzip -qo "${tempZipPath}" -d "${targetDir}" -x "package.json"`);
    } else if (platform === 'win32') {
      // Windows 使用内置 tar，--exclude 排除 package.json
      execSync(`tar -xf "${tempZipPath}" -C "${targetDir}" --exclude="package.json"`);
    } else {
      throw new Error(`暂不支持的操作系统: ${platform}`);
    }

    // 6. 清理临时下载的 zip 文件
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }

    console.log(`🎉 [成功] 版本 v${version} 的专属文件已完美部署，本地 package.json 未受任何污染！`);

  } catch (err) {
    console.error('❌ [失败] 自动部署原生模块时发生严重错误:', err);
    if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
    process.exit(1);
  }
}

downloadAndUnzip();