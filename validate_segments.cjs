/**
 * validate_segments.cjs — 合并后校验脚本
 *
 * 用法: node validate_segments.cjs <合并后的.md文件>
 * 功能: 检查事件数、Action 连续重复、ID 空隙、结局文本
 */

const fs = require('fs');

const filePath = process.argv[2];
if (!filePath) {
  console.error('用法: node validate_segments.cjs <合并后的.md文件>');
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// 提取事件行
const eventLines = [];
let inEvents = false;
for (const line of lines) {
  const t = line.trim();
  if (t === '## Events') { inEvents = true; continue; }
  if (inEvents && (t.startsWith('## ') || t.startsWith('### ')) && t !== '## Events') break;
  if (!inEvents) continue;
  if (t.startsWith('|') && !t.startsWith('| ID |') && !t.startsWith('|---')) {
    eventLines.push(t);
  }
}

const issues = [];

// 1. 提取事件数据
const events = [];
for (const line of eventLines) {
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 10) continue;
  const id = parts[1];
  const type = parts[2];
  const minLevel = parseInt(parts[3], 10);
  const minRebirth = parseInt(parts[7], 10);
  const action = parts[8];
  const text = parts[9];
  events.push({ id, type, minLevel, minRebirth, action, text, raw: line });
}

// 2. 检查 ID 空隙
const ids = events.map(e => {
  const m = e.id.match(/e(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}).filter(id => id >= 0).sort((a, b) => a - b);

if (ids.length > 0) {
  const missing = [];
  for (let i = ids[0]; i <= ids[ids.length - 1]; i++) {
    if (!ids.includes(i)) missing.push(i);
  }
  if (missing.length > 0) {
    const sample = missing.slice(0, 10);
    issues.push(`[ID空隙] 缺失 ${missing.length} 个 ID，示例: ${sample.map(n => 'e' + String(n).padStart(4, '0')).join(', ')}`);
  }
}

// 3. 检查 Action 连续重复（>=3）
const storyEvents = events.filter(e => e.type === 'story');
const fillerEvents = events.filter(e => e.type === 'filler');

for (const [label, list] of [['story', storyEvents], ['filler', fillerEvents]]) {
  let lastAction = '';
  let streak = 0;
  for (const e of list) {
    if (e.action === lastAction) {
      streak++;
      if (streak >= 3) {
        issues.push(`[Action重复] ${label}: ${e.id}(${e.action}) 连续 ${streak} 次`);
      }
    } else {
      lastAction = e.action;
      streak = 1;
    }
  }
}

// 4. 检查结局文本
const lastStory = storyEvents.filter(e => e.minRebirth === 0).pop();
if (lastStory) {
  console.log(`  结局 story: ${lastStory.id} (Lv.${storyEvents.filter(e => e.minRebirth === 0).length}) "${lastStory.text}"`);
  if (lastStory.text.length < 20) {
    issues.push(`[结局文本] 结局 story 文本过短 (${lastStory.text.length} 字)`);
  }
}

// 5. 检查总事件数
const storyCounts = {};
const fillerCounts = {};
for (const e of events) {
  const r = e.minRebirth;
  if (e.type === 'story') {
    storyCounts[r] = (storyCounts[r] || 0) + 1;
  } else {
    fillerCounts[r] = (fillerCounts[r] || 0) + 1;
  }
}

console.log(`  总事件数: ${events.length}`);
console.log(`  Story 分布:`, storyCounts);
console.log(`  Filler 分布:`, fillerCounts);

// 输出
if (issues.length > 0) {
  console.error('\n⚠️ 发现以下问题:');
  for (const issue of issues) {
    console.error(`  ${issue}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ 校验通过，无问题');
}
