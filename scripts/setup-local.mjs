import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('请从项目根目录执行 npm run setup:local');
for (const folder of ['backend', 'customer', 'frontend']) {
  console.log(`安装 ${folder} 依赖…`);
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, [npm, 'install', '--no-audit', '--no-fund'], { cwd: resolve(root, folder), stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? done() : reject(new Error(`${folder} 依赖安装失败`)));
  });
}
console.log('依赖已准备完成，执行 npm run dev:local 启动。');
