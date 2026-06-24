const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function md5(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function getIcoPath(root) {
  let ico = path.join(root, 'icons', 'icon_png.ico');
  if (fs.existsSync(ico)) {
    console.log('Using icon_png.ico (PNG-in-ICO)');
    return ico;
  }
  ico = path.join(root, 'icons', 'icon.ico');
  if (fs.existsSync(ico)) {
    console.log('Using icon.ico (BMP-in-ICO)');
    return ico;
  }
  return null;
}

function injectIcon(exePath, icoPath) {
  if (!fs.existsSync(exePath)) {
    console.error('  [SKIP] Not found:', exePath);
    return false;
  }

  const beforeMD5 = md5(exePath);

  // Try app-builder first
  const appBuilder = path.join(path.dirname(exePath), '..', 'node_modules', 'app-builder-bin', 'win', 'x64', 'app-builder.exe');
  if (fs.existsSync(appBuilder)) {
    try {
      execSync(`"${appBuilder}" set-icon --input "${exePath}" --icon "${icoPath}"`, { stdio: 'pipe', timeout: 30000 });
      if (md5(exePath) !== beforeMD5) {
        console.log('  [OK] app-builder →', path.basename(exePath));
        return true;
      }
      console.log('  [FAIL] app-builder: MD5 unchanged');
    } catch (e) {
      console.log('  [FAIL] app-builder:', e.message.split('\n')[0]);
    }
  }

  // Fallback: rcedit (retry up to 3 times)
  const rcedit = path.join(__dirname, '..', 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');
  if (!fs.existsSync(rcedit)) {
    console.error('  [FAIL] rcedit binary not found');
    return false;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync(`"${rcedit}" "${exePath}" --set-icon "${icoPath}"`, { stdio: 'pipe', timeout: 30000 });
      if (md5(exePath) !== beforeMD5) {
        console.log('  [OK] rcedit →', path.basename(exePath), `(attempt ${attempt})`);
        return true;
      }
      console.log(`  [RETRY ${attempt}/3] rcedit: MD5 unchanged, waiting...`);
      execSync(`powershell -Command "Start-Sleep -Milliseconds 1500"`, { stdio: 'pipe', timeout: 5000 });
    } catch (e) {
      console.log(`  [RETRY ${attempt}/3] rcedit:`, e.message.split('\n')[0]);
      execSync(`powershell -Command "Start-Sleep -Milliseconds 1500"`, { stdio: 'pipe', timeout: 5000 });
    }
  }

  console.error('  [FAIL] rcedit: all 3 attempts failed');
  return false;
}

function main() {
  const root = path.join(__dirname, '..');
  const ico = getIcoPath(root);
  if (!ico) {
    console.error('No icon file found (tried icon_png.ico and icon.ico)');
    process.exit(1);
  }

  const mode = process.argv[2] || 'post';
  let ok = true;

  if (mode === 'pre') {
    const targets = [
      path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    ];
    console.log('Pre-build icon injection:');
    targets.forEach(t => { if (!injectIcon(t, ico)) ok = false; });
  } else {
    const targets = [
      path.join(root, 'release', 'win-unpacked', 'Idel-DreamMaker.exe'),
    ];
    console.log('Post-build icon injection:');
    targets.forEach(t => { if (!injectIcon(t, ico)) ok = false; });
  }

  if (!ok) process.exit(1);
}

main();
