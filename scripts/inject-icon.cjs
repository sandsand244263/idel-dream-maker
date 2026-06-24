const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function main() {
  const root = path.join(__dirname, '..');
  const exe = path.join(root, 'release', 'win-unpacked', 'Idel-DreamMaker.exe');
  const ico = path.join(root, 'icons', 'icon.ico');

  if (!fs.existsSync(exe)) {
    console.error('Not found:', exe);
    process.exit(1);
  }
  if (!fs.existsSync(ico)) {
    console.error('Not found:', ico);
    process.exit(1);
  }

  // Use app-builder.exe (electron-builder's native tool) for icon injection
  const appBuilder = path.join(root, 'node_modules', 'app-builder-bin', 'win', 'x64', 'app-builder.exe');
  if (fs.existsSync(appBuilder)) {
    try {
      execSync(`"${appBuilder}" set-icon --input "${exe}" --icon "${ico}"`, { stdio: 'inherit', timeout: 30000 });
      console.log('Icon injected via app-builder');
      return;
    } catch (e) {
      console.log('app-builder failed:', e.message);
    }
  }

  // Fallback: use rcedit-x64.exe directly
  const rcedit = path.join(root, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');
  if (fs.existsSync(rcedit)) {
    try {
      execSync(`"${rcedit}" "${exe}" --set-icon "${ico}"`, { stdio: 'inherit', timeout: 30000 });
      console.log('Icon injected via rcedit');
      return;
    } catch (e) {
      console.log('rcedit failed:', e.message);
    }
  }

  console.error('No icon injection tool available');
  process.exit(1);
}

main();
