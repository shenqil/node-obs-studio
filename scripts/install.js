const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function downloadBinary() {
    // ... 前面的网络下载逻辑保持不变，把文件先下载存为本地临时文件，例如叫 tmp.tar.gz ...
    const tempTarball = path.join(__dirname, '../tmp.tar.gz');
    const targetDir = path.join(__dirname, '../bin');

    // [假装这里是你的下载写入代码，完成后执行下面这段]

    try {
        console.log(`📦 正在调用系统原生 tar 命令解压...`);

        // 使用系统原生 tar 命令：-x (解压), -z (gzip), -f (指定文件), -C (指定解压目录)
        execSync(`tar -xzf "${tempTarball}" -C "${targetDir}"`);

        // 解压完成后，顺手把临时的压缩包删掉，保持干净
        fs.unlinkSync(tempTarball);

        console.log('🎉 [成功] obs-studio-node 原生项目包已部署完毕！');
    } catch (err) {
        console.error('❌ [失败] 系统原生解压失败，请检查环境:', err);
        process.exit(1);
    }
}