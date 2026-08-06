// 截图模式驱动：SCREENSHOT_MODE=场景数 启动 Electron 截帧 → 按场景输出
// 场景1(宠物窗口 6帧) → pet-window.gif（悬停完整UI动图）
// 场景2(家)          → hub.jpg（静帧）
// 场景3(档案中心)    → archive.jpg（静帧）
// 用法：node scripts/screenshot-gif.cjs [场景数=3]
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SHOT_DIR = path.join(__dirname, '..', 'shots_tmp');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
for (const f of fs.readdirSync(SHOT_DIR)) fs.unlinkSync(path.join(SHOT_DIR, f));

const scenes = process.argv[2] ? parseInt(process.argv[2], 10) : 3;
const electronPath = require('electron');
const projectRoot = path.join(__dirname, '..');
console.log('[shot] scenes:', scenes);

const child = spawn(electronPath, [projectRoot], {
  env: { ...process.env, SCREENSHOT_MODE: String(scenes), ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  stdio: 'inherit',
});

const timer = setTimeout(() => {
  console.log('[shot] timeout, killing');
  child.kill();
  process.exit(1);
}, 120000);

child.on('exit', (code) => {
  clearTimeout(timer);
  console.log('[shot] electron exited', code);
  const ffmpeg = 'C:\\Users\\Administrator\\AppData\\Local\\ffmpeg\\ffmpeg.exe';
  const frames = fs.readdirSync(SHOT_DIR).filter(f => f.endsWith('.png')).sort();
  console.log('[shot] frames captured:', frames.length);
  let idx = 0;
  try {
    // 场景 1：前 6 帧 → pet-window.gif
    if (scenes >= 1 && frames.length >= 6) {
      const gif = path.join(OUT_DIR, 'pet-window.gif');
      execSync(`"${ffmpeg}" -y -framerate 3 -i "${path.join(SHOT_DIR, 'shot_%02d.png')}" -vf "fps=3,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gif}"`, { stdio: 'inherit' });
      console.log('[shot] gif OK:', gif, (fs.statSync(gif).size / 1024).toFixed(0) + 'KB');
      idx = 6;
    }
    // 场景 2：下一帧 → hub.jpg
    if (scenes >= 2 && frames.length > idx) {
      const jpg = path.join(OUT_DIR, 'hub.jpg');
      execSync(`"${ffmpeg}" -y -i "${path.join(SHOT_DIR, 'shot_' + String(idx + 1).padStart(2, '0') + '.png')}" -vf "scale=320:-1:flags=lanczos" -q:v 4 "${jpg}"`, { stdio: 'inherit' });
      console.log('[shot] jpg OK:', jpg, (fs.statSync(jpg).size / 1024).toFixed(0) + 'KB');
      idx++;
    }
    // 场景 3：再下一帧 → archive.jpg
    if (scenes >= 3 && frames.length > idx) {
      const jpg = path.join(OUT_DIR, 'archive.jpg');
      execSync(`"${ffmpeg}" -y -i "${path.join(SHOT_DIR, 'shot_' + String(idx + 1).padStart(2, '0') + '.png')}" -vf "scale=320:-1:flags=lanczos" -q:v 4 "${jpg}"`, { stdio: 'inherit' });
      console.log('[shot] jpg OK:', jpg, (fs.statSync(jpg).size / 1024).toFixed(0) + 'KB');
    }
    process.exit(0);
  } catch (e) {
    console.error('[shot] convert failed:', e.message);
    process.exit(1);
  }
});
