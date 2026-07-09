const fs = require('fs');
const path = require('path');

const testDir = path.join(require('os').tmpdir(), 'idel_cache_test_' + Date.now());
fs.mkdirSync(testDir, { recursive: true });

let _logCache = null;
let _logCacheMtime = 0;

function _readAllLogFiles() {
  try {
    let mtime = 0;
    try { mtime = fs.statSync(testDir).mtimeMs; } catch {}
    if (_logCache && _logCacheMtime === mtime) { console.log('  → cache HIT'); return _logCache; }
    console.log('  → cache MISS (or first read)');
    if (!fs.existsSync(testDir)) { _logCache = []; _logCacheMtime = mtime; return []; }
    const files = fs.readdirSync(testDir).filter(f => f.endsWith('.log'));
    const all = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(testDir, f), 'utf-8').trim();
        if (!content) continue;
        for (const line of content.split('\n')) {
          try { all.push(JSON.parse(line)); } catch {}
        }
      } catch {}
    }
    _logCache = all;
    _logCacheMtime = mtime;
    return all;
  } catch { return []; }
}

// Step 1: Create log file with 1 entry
const logFile = path.join(testDir, 'test_20260709_143000.log');
fs.writeFileSync(logFile, JSON.stringify({ t: '2026-07-09 14:30:00', ty: 'event', m: 'entry1' }) + '\n', 'utf-8');
console.log('1. Created log file with 1 entry');
console.log('   File mtime:', fs.statSync(logFile).mtimeMs.toFixed(0));
console.log('   Dir  mtime:', fs.statSync(testDir).mtimeMs.toFixed(0));

// Step 2: First read
console.log('\n2. First read:');
const r1 = _readAllLogFiles();
console.log('   Entries found:', r1.length);
console.log('   Cache mtime:', _logCacheMtime);

// Step 3: Append new entry
console.log('\n3. Appending new entry...');
fs.appendFileSync(logFile, JSON.stringify({ t: '2026-07-09 15:00:00', ty: 'event', m: 'entry2' }) + '\n', 'utf-8');
console.log('   File mtime:', fs.statSync(logFile).mtimeMs.toFixed(0));
console.log('   Dir  mtime:', fs.statSync(testDir).mtimeMs.toFixed(0));
console.log('   Dir mtime changed:', fs.statSync(testDir).mtimeMs !== _logCacheMtime);

// Step 4: Second read
console.log('\n4. Second read:');
const r2 = _readAllLogFiles();
console.log('   Entries found:', r2.length);
console.log('   Entry texts:', r2.map(e => e.m).join(', '));

// Step 5: Third read (same)
console.log('\n5. Third read (no change):');
const r3 = _readAllLogFiles();
console.log('   Cache HIT expected');
console.log('   Entries found:', r3.length);
console.log('   Entry texts:', r3.map(e => e.m).join(', '));

// Step 6: Create a new file
console.log('\n6. Creating new log file...');
const logFile2 = path.join(testDir, 'test2_20260709_160000.log');
fs.writeFileSync(logFile2, JSON.stringify({ t: '2026-07-09 16:00:00', ty: 'event', m: 'entry3' }) + '\n', 'utf-8');
console.log('   Dir mtime:', fs.statSync(testDir).mtimeMs.toFixed(0));
console.log('   Dir mtime changed:', fs.statSync(testDir).mtimeMs !== _logCacheMtime);

// Step 7: Read after new file
console.log('\n7. Read after new file:');
const r4 = _readAllLogFiles();
console.log('   Entries found:', r4.length);
console.log('   Entry texts:', r4.map(e => e.m).join(', '));

// Cleanup
fs.rmSync(testDir, { recursive: true, force: true });

console.log('\n=== RESULT ===');
if (r2.length === 2) {
  console.log('APPEND: ✓ Cache correctly missed — new entries visible');
} else {
  console.log('APPEND: ✗ BUG — cache returned stale data after append');
}
if (r4.length === 3) {
  console.log('NEW FILE: ✓ Cache correctly missed — new file visible');
} else {
  console.log('NEW FILE: ✗ BUG — cache returned stale data after new file');
}
