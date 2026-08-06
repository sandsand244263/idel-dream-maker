// 截图模式：SCREENSHOT_MODE=1 时启动，自动截帧生成 PNG 序列（供 ffmpeg 转 gif）
// 用法：node scripts/screenshot-gif.cjs [场景数]
// 场景：1=宠物窗口 2=家(主窗口) 3=档案中心 4=故事气泡
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SHOT_DIR = path.join(__dirname, '..', 'shots_tmp');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

// 清空旧帧
for (const f of fs.readdirSync(SHOT_DIR)) fs.unlinkSync(path.join(SHOT_DIR, f));

const scenes = process.argv[2] ? parseInt(process.argv[2], 10) : 4;
const electronPath = require('electron');  // 返回 electron 可执行文件路径
const projectRoot = path.join(__dirname, '..');

console.log('[shot] electron:', electronPath);
console.log('[shot] scenes:', scenes);

const child = spawn(electronPath, [projectRoot], {
  env: { ...process.env, SCREENSHOT_MODE: String(scenes), ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  stdio: 'inherit',
});

const timer = setTimeout(() => {
  console.log('[shot] timeout, killing');
  child.kill();
  process.exit(1);
}, 90000);

child.on('exit', (code) => {
  clearTimeout(timer);
  console.log('[shot] electron exited', code);
  // ffmpeg 转 gif
  const ffmpeg = 'C:\\Users\\Administrator\\AppData\\Local\\ffmpeg\\ffmpeg.exe';
  const outGif = path.join(projectRoot, 'docs', 'screenshots', 'v4-demo.gif');
  fs.mkdirSync(path.dirname(outGif), { recursive: true });
  const { execSync } = require('child_process');
  const cmd = `"${ffmpeg}" -y -framerate 3 -i "${path.join(SHOT_DIR, 'shot_%02d.png')}" -vf "fps=3,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${outGif}"`;
  try {
    execSync(cmd, { stdio: 'inherit' });
    const size = fs.statSync(outGif).size;
    console.log('[shot] gif OK:', outGif, (size / 1024).toFixed(1) + 'KB');
    process.exit(0);
  } catch (e) {
    console.error('[shot] ffmpeg failed:', e.message);
    process.exit(1);
  }
});
