import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(root, 'backend');
const state = resolve(root, '.local');
mkdirSync(state, { recursive: true });
const secretPath = resolve(state, 'jwt-secret');
if (!existsSync(secretPath)) writeFileSync(secretPath, randomBytes(32).toString('hex'));
const env = { ...process.env, NODE_ENV: 'development', DEMO_MODE: 'true', DB_TYPE: 'sqlite', DB_DATABASE: resolve(state, 'demo.sqlite'), JWT_SECRET: readFileSync(secretPath, 'utf8'), HOST: '127.0.0.1', PORT: '3000' };
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('本地仿真需要 Node.js 22 或更新版本');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
function run(file, args, cwd, wait = false) {
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: 'inherit', windowsHide: true });
    children.push(child);
    child.on('error', reject);
    child.on('exit', code => {
      if (wait) code === 0 ? done(child) : reject(new Error(`命令失败，退出码 ${code}`));
      else if (!stopping) { console.error(`服务已退出：${cwd} (${code})`); stop(code || 1); }
    });
    if (!wait) done(child);
  });
}
function occupied(port) {
  return new Promise(done => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); done(true); });
    socket.once('error', () => done(false));
  });
}
async function ready(url) {
  for (let i = 0; i < 80; i++) {
    if (stopping) throw new Error('服务提前停止');
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.ok) return; } catch {}
    await new Promise(done => setTimeout(done, 250));
  }
  throw new Error(`等待服务超时：${url}`);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
try {
  if (await occupied(3000)) throw new Error('3000端口已占用，请先停止已有后端；不会覆盖其数据库。');
  await run(resolve(backend, 'node_modules/@nestjs/cli/bin/nest.js'), ['build'], backend, true);
  await run(resolve(backend, 'dist/database/seed-demo.js'), [], backend, true);
  await run(resolve(backend, 'dist/main.js'), [], backend);
  await ready('http://127.0.0.1:3000/health');
  if (!process.argv.includes('--backend-only')) {
    for (const [folder, port, title] of [['customer', 5180, '网吧用户端'], ['frontend', 5173, '网吧综合管理系统']]) {
      if (await occupied(port)) {
        const html = await (await fetch(`http://127.0.0.1:${port}`)).text();
        if (!html.includes(title)) throw new Error(`${port}端口被其他应用占用`);
        console.log(`复用已有${folder}开发服务：${port}`);
      } else {
        const cwd = resolve(root, folder);
        const vite = resolve(cwd, 'node_modules/vite/bin/vite.js');
        if (!existsSync(vite)) throw new Error(`请先执行 npm install --prefix ${folder}`);
        await run(vite, ['--host', '127.0.0.1', '--port', String(port), '--strictPort'], cwd);
      }
      await ready(`http://127.0.0.1:${port}`);
    }
  }
  console.log('\n本地仿真已启动（不连接真实支付或短信）\n顾客端 http://127.0.0.1:5180\n管理端 http://127.0.0.1:5173\nAPI文档 http://127.0.0.1:3000/api\n顾客 13800138001 / 验证码123456（初始余额300元演示资金）\n店长 admin / admin123\nCtrl+C 停止本次启动的服务，数据库保留在 .local/demo.sqlite\n');
} catch (error) { console.error(error.message); stop(1); }
