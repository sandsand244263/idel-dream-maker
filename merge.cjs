/**
 * merge.cjs — 合并分段文件为目标 .md 文件
 *
 * 用法：node merge.cjs <输出文件> <输入文件...>
 *
 * 功能：
 *   1. 从各输入文件中提取 ## 节内容
 *   2. 按 frontmatter → ## Titles → ## Achievements → ## Events → ## HolidayEvents 顺序拼接
 *   3. Events 节合并多个文件（去重表头行、移除空行）
 *   4. 写入输出文件
 *
 * 示例：
 *   node merge.cjs scenarios/wasteland.md ^
 *     temp/wasteland_titles.md ^
 *     temp/wasteland_achievements.md ^
 *     temp/wasteland_r0_seg1.md temp/wasteland_r0_seg2.md ... ^
 *     temp/wasteland_r1_seg1.md ... ^
 *     temp/wasteland_holidays.md
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('用法: node merge.cjs <输出文件> <输入文件...>');
  process.exit(1);
}

const outputPath = args[0];
const inputPaths = args.slice(1);

// 确保 temp/ 目录存在
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 初始化 parts
const parts = {
  frontmatter: null,
  titles: null,
  achievements: null,
  events: [],
  holidays: null,
};

const sectionNames = ['###', '##']; // 支持 ## 和 ###

for (const fpath of inputPaths) {
  if (!fs.existsSync(fpath)) {
    console.error(`[WARN] 文件不存在，跳过: ${fpath}`);
    continue;
  }

  const content = fs.readFileSync(fpath, 'utf-8');
  const lines = content.split('\n');

  // 根据文件内容检测各节
  const hasFrontmatter = content.trim().startsWith('---');
  const hasEvents = lines.some(l => l.trim() === '## Events');
  const hasTitles = lines.some(l => l.trim() === '## Titles');
  const hasAchievements = lines.some(l => l.trim() === '## Achievements');
  const hasHolidays = lines.some(l => l.trim() === '## HolidayEvents');

  // 提取 frontmatter（从以 --- 开头的文件）
  if (hasFrontmatter && !hasEvents && !hasTitles && !hasAchievements && !hasHolidays) {
    const endIdx = content.indexOf('\n---', 3);
    if (endIdx > 0) {
      parts.frontmatter = content.substring(0, endIdx + 4).trim();
      console.log(`  [Frontmatter] 从 ${path.basename(fpath)} 读取`);
    }
  }

  // 提取 Titles 数据
  if (hasTitles) {
    const dataLines = [];
    let inSection = false;
    for (const line of lines) {
      const t = line.trim();
      if (t === '## Titles') { inSection = true; continue; }
      if (sectionNames.some(s => t.startsWith(s + ' ')) && t !== '## Titles') { inSection = false; continue; }
      if (!inSection) continue;
      dataLines.push(t);
    }
    if (dataLines.length > 0) {
      parts.titles = dataLines.join('\n');
      console.log(`  [Titles] 从 ${path.basename(fpath)} 读取`);
    }
  }

  // 提取 Achievements 数据
  if (hasAchievements) {
    const dataLines = [];
    let inSection = false;
    for (const line of lines) {
      const t = line.trim();
      if (t === '## Achievements') { inSection = true; continue; }
      if (sectionNames.some(s => t.startsWith(s + ' ')) && t !== '## Achievements') { inSection = false; continue; }
      if (!inSection) continue;
      dataLines.push(t);
    }
    if (dataLines.length > 0) {
      parts.achievements = dataLines.join('\n');
      console.log(`  [Achievements] 从 ${path.basename(fpath)} 读取`);
    }
  }

  // 提取 Events 数据（从任何含 ## Events 的文件）
  if (hasEvents) {
    const dataLines = [];
    let inEvents = false;
    dataLines.push('| ID | Type | MinLevel | MinHours | Weight | Once | MinRebirth | Action | Text |');
    dataLines.push('|---|---|---|---|---|---|---|---|---|');

    for (const line of lines) {
      const t = line.trim();
      if (t === '## Events') { inEvents = true; continue; }
      if (sectionNames.some(s => t.startsWith(s + ' ')) && t !== '## Events') { inEvents = false; continue; }
      if (!inEvents) continue;
      if (t.startsWith('| ID |') || t.startsWith('|---')) continue;
      if (t === '') continue;
      if (t.startsWith('|')) {
        dataLines.push(t);
      }
    }

    if (dataLines.length > 2) {
      parts.events.push(dataLines);
      console.log(`  [Events] 从 ${path.basename(fpath)} 读取了 ${dataLines.length - 2} 条事件`);
    }
  }

  // 提取 HolidayEvents 数据
  if (hasHolidays) {
    const dataLines = [];
    let inSection = false;
    for (const line of lines) {
      const t = line.trim();
      if (t === '## HolidayEvents') { inSection = true; continue; }
      if (sectionNames.some(s => t.startsWith(s + ' ')) && t !== '## HolidayEvents') { inSection = false; continue; }
      if (!inSection) continue;
      dataLines.push(t);
    }
    if (dataLines.length > 0) {
      parts.holidays = dataLines.join('\n');
      console.log(`  [HolidayEvents] 从 ${path.basename(fpath)} 读取`);
    }
  }
}

// 拼接输出
const outputLines = [];

// 1. frontmatter
if (parts.frontmatter) {
  outputLines.push(parts.frontmatter);
  outputLines.push('');
}

// 2. Titles
if (parts.titles) {
  outputLines.push('## Titles');
  outputLines.push('');
  outputLines.push(parts.titles);
  outputLines.push('');
}

// 3. Achievements
if (parts.achievements) {
  outputLines.push('## Achievements');
  outputLines.push('');
  outputLines.push(parts.achievements);
  outputLines.push('');
}

// 4. Events
if (parts.events.length > 0) {
  outputLines.push('## Events');
  outputLines.push('');

  // 合并所有事件文件的数据
  const allEventRows = [];
  let headerPushed = false;
  for (const fileData of parts.events) {
    const rows = fileData;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].trim();
      if (row === '') continue;

      // 表头行：只保留第一次出现的
      if (row.startsWith('| ID |')) {
        if (!headerPushed) {
          // 同时推入表头行和分隔行
          allEventRows.push(row);
          if (i + 1 < rows.length) {
            allEventRows.push(rows[i + 1].trim());
          }
          headerPushed = true;
        }
        continue;
      }

      // 分隔行（紧跟在表头后面的已经处理了，这里跳过剩余的）
      if (row.startsWith('|---')) continue;

      allEventRows.push(row);
    }
  }

  outputLines.push(allEventRows.join('\n'));
  outputLines.push('');
}

// 5. HolidayEvents
if (parts.holidays) {
  outputLines.push('## HolidayEvents');
  outputLines.push('');
  outputLines.push(parts.holidays);
  outputLines.push('');
}

// 写入
const result = outputLines.join('\n');
fs.writeFileSync(outputPath, result, 'utf-8');

// 统计
const eventCount = (result.match(/\| [a-zA-Z0-9_]+_e\d{4} \|/g) || []).length;
console.log('');
console.log(`[DONE] 已写入 ${outputPath}`);
console.log(`       事件总数: ${eventCount}`);
