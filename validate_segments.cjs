#!/usr/bin/env node
/**
 * validate_segments.cjs — 合并后 .md 的段级校验（v4 口径：按表头名取列 + MinSeconds 时间轴）
 *
 * 用法：
 *   node validate_segments.cjs <md文件>            常规校验
 *   node validate_segments.cjs <md文件> --strict   WARN 也算失败
 *   node validate_segments.cjs --help              看用法
 * 示例：
 *   node validate_segments.cjs scenarios/backrooms.md
 *
 * 列口径与 src/scenario-parser.cjs 完全一致：**按表头名取列，不认列位**（v4 是 20 列，
 * v3 是另一套列序，硬编码下标必错位）。时间轴一律用 MinSeconds（秒）；
 * 旧格式只有 MinLevel 时按解析器同一规则换算：minSeconds = MinLevel × 600。
 *
 * 检查项：
 *   1. 表格结构：Events 表列数（每行必须与表头同列数）、必须列（ID/Type/Text）、
 *      表格被空行或非表格行打断、行末缺 '|'
 *   2. ID：重复（ERROR）、同副本内编号缺口（WARN，缺口多为号段预留，供补内容参考）、
 *      choice target 悬空（ERROR）
 *   3. 节奏：同一分支链内按 minSeconds 排序后，Action 连续 ≥3 次重复（ERROR）；
 *      Action 为空的行跳过（v4 副本可以不填 Action）
 *   4. 结局：每条分支链（branches + 隐藏链）的链末事件文本不能空（ERROR）、<20 字（WARN）；
 *      CompletionTitle 有值却不在该链末尾（ERROR）
 *   5. 分布：各分支段数与时间跨度、Type 分布（v4 只应有 story，出现 filler 等 → WARN）
 *
 * 退出码：
 *   0  无 ERROR（WARN 默认不影响退出码）
 *   1  存在 ERROR；或加了 --strict 且存在 WARN
 *   2  用法错误 / 文件不存在 / 找不到 Events 表（没法校验）
 */

const fs = require('fs');

const USAGE = [
  '用法: node validate_segments.cjs <md文件> [--strict]',
  '  <md文件>   要校验的副本 .md（如 scenarios/backrooms.md）',
  '  --strict   WARN 也按失败处理',
  '',
  '退出码: 0=无 ERROR  1=有 ERROR（或 --strict 下有 WARN）  2=用法/文件/结构无法解析',
].join('\n');

const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) {
  console.log(USAGE);
  process.exit(0);
}
const strict = argv.includes('--strict');
const filePath = argv.find(a => !a.startsWith('-'));

if (!filePath) {
  console.error('[ERROR] 缺少 md 文件参数\n' + USAGE);
  process.exit(2);
}
if (!fs.existsSync(filePath)) {
  console.error('[ERROR] 文件不存在: ' + filePath);
  process.exit(2);
}

// ── 表头名归一（与 scenario-parser.cjs 的 COL_NORM 同义，多认几个中文名） ──
const COL_ALIASES = {
  'id': 'id', '编号': 'id',
  'type': 'type', '类型': 'type',
  'minseconds': 'minseconds', 'min_seconds': 'minseconds', '解锁秒数': 'minseconds',
  'minlevel': 'minlevel', 'min_level': 'minlevel', '最低等级': 'minlevel',
  'minhours': 'minhours', 'min_hours': 'minhours', '最低挂机小时数': 'minhours',
  'weight': 'weight', '权重': 'weight',
  'once': 'once', '只触发一次': 'once',
  'branch': 'branch', '分支': 'branch',
  'flagset': 'flagset', 'flag_set': 'flagset',
  'flagrequire': 'flagrequire', 'flag_require': 'flagrequire',
  'completiontitle': 'completiontitle', 'completion_title': 'completiontitle',
  'choice1': 'choice1', 'choice1target': 'choice1target', 'choice_1_target': 'choice1target',
  'choice2': 'choice2', 'choice2target': 'choice2target', 'choice_2_target': 'choice2target',
  'choice3': 'choice3', 'choice3target': 'choice3target', 'choice_3_target': 'choice3target',
  'choice4': 'choice4', 'choice4target': 'choice4target', 'choice_4_target': 'choice4target',
  'action': 'action', '动作': 'action',
  'text': 'text', '事件文本': 'text',
};
const normCol = h => {
  const k = String(h).trim().toLowerCase().replace(/\s+/g, '');
  return COL_ALIASES[k] || k;
};

function splitCells(line) {
  const inner = line.replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let buf = '';
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '\\' && inner[i + 1] === '|') { buf += '|'; i++; continue; }
    if (inner[i] === '|') { cells.push(buf.trim()); buf = ''; continue; }
    buf += inner[i];
  }
  cells.push(buf.trim());
  return cells;
}

function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  if (s < 3600) return Math.round(s / 60) + 'min';
  return (s / 3600).toFixed(1) + 'h';
}

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split(/\r?\n/);

// ── frontmatter（只取校验要用的字段，不引 yaml 依赖） ──
const meta = { id: '', name_cn: '', branches: [] };
if (lines[0] && lines[0].trim() === '---') {
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end > 0) {
    const yaml = lines.slice(1, end).join('\n');
    const pick = re => { const m = yaml.match(re); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : ''; };
    meta.id = pick(/^id:\s*(.+)$/m);
    meta.name_cn = pick(/^name_cn:\s*(.+)$/m);
    const br = pick(/^branches:\s*\[(.*)\]/m);
    meta.branches = br ? br.split(',').map(s => s.trim()).filter(Boolean) : [];
  }
}

// ── Events 表 ──
const secStart = lines.findIndex(l => l.trim() === '## Events');
if (secStart === -1) {
  console.error('[ERROR] 找不到 "## Events" 章节，无法校验: ' + filePath);
  process.exit(2);
}
let secEnd = lines.length;
for (let i = secStart + 1; i < lines.length; i++) {
  if (lines[i].trim().startsWith('## ')) { secEnd = i; break; }
}

const errors = [];
const warns = [];

let headers = null;
const rows = [];          // { lineNo, cells }
let tableStarted = false;
let lastPipeLine = -1;    // 最后一个以 | 开头的行（用于判断空行是否落在表内）
const blankLines = [];
for (let i = secStart + 1; i < secEnd; i++) {
  const raw = lines[i];
  const t = raw.trim();
  if (t === '') {
    if (tableStarted) blankLines.push(i + 1);
    continue;
  }
  if (!t.startsWith('|')) {
    if (tableStarted) errors.push(`[结构] 第 ${i + 1} 行：表格被非表格行打断 -> "${t.slice(0, 40)}"`);
    continue;
  }
  tableStarted = true;
  lastPipeLine = i + 1;
  if (!t.endsWith('|')) {
    errors.push(`[结构] 第 ${i + 1} 行：行末缺少 |`);
    continue;
  }
  if (/^\|[\s\-:|]+\|$/.test(t)) continue;      // 分隔行
  const cells = splitCells(t);
  if (!headers) { headers = cells; continue; }
  rows.push({ lineNo: i + 1, cells });
}
// 表内空行会让 parseTable 提前终止；表尾之后的空行无害
for (const ln of blankLines) {
  if (ln < lastPipeLine) errors.push(`[结构] 第 ${ln} 行：Events 表内部有空行（parseTable 会提前终止）`);
}

if (!headers) {
  console.error('[ERROR] Events 表没有表头行，无法校验: ' + filePath);
  process.exit(2);
}

const headerNames = headers.map(normCol);
const col = (...names) => {
  for (const n of names) {
    const i = headerNames.indexOf(normCol(n));
    if (i !== -1) return i;
  }
  return -1;
};

const idx = {
  id: col('ID'),
  type: col('Type'),
  minSeconds: col('MinSeconds'),
  minLevel: col('MinLevel'),
  branch: col('Branch'),
  flagSet: col('FlagSet'),
  flagRequire: col('FlagRequire'),
  completionTitle: col('CompletionTitle'),
  action: col('Action'),
  text: col('Text'),
  choice: [col('Choice1'), col('Choice2'), col('Choice3'), col('Choice4')],
  choiceTarget: [col('Choice1Target'), col('Choice2Target'), col('Choice3Target'), col('Choice4Target')],
};

for (const [key, name] of [['id', 'ID'], ['type', 'Type'], ['text', 'Text']]) {
  if (idx[key] === -1) errors.push(`[结构] 缺少必需列: ${name}`);
}
if (idx.minSeconds === -1 && idx.minLevel === -1) {
  errors.push('[结构] 既没有 MinSeconds 列也没有 MinLevel 列，时间轴无法确定');
}
if (errors.some(e => e.startsWith('[结构] 缺少必需列') || e.startsWith('[结构] 既没有'))) {
  reportAndExit();
}

const get = (row, i) => (i >= 0 && i < row.cells.length ? row.cells[i] : '');
const timeMode = idx.minSeconds !== -1
  ? 'MinSeconds'
  : 'MinLevel ×600 换算（旧格式）';

// ── 逐行解析 ──
const events = [];
let badCols = 0;
for (const row of rows) {
  if (row.cells.length !== headers.length) {
    badCols++;
    if (badCols <= 5) {
      errors.push(`[结构] 第 ${row.lineNo} 行列数 ${row.cells.length}，表头 ${headers.length}（"${(row.cells[0] || '').slice(0, 20)}"）`);
    }
  }
  const rawSec = get(row, idx.minSeconds);
  const rawLvl = get(row, idx.minLevel);
  let minSeconds = 0;
  if (rawSec !== '') minSeconds = parseInt(rawSec, 10) || 0;
  else if (rawLvl !== '') minSeconds = (parseInt(rawLvl, 10) || 1) * 600;

  events.push({
    lineNo: row.lineNo,
    id: get(row, idx.id),
    type: (get(row, idx.type) || 'story').toLowerCase(),
    minSeconds,
    branch: get(row, idx.branch).trim(),
    flagSet: get(row, idx.flagSet),
    flagRequire: get(row, idx.flagRequire),
    completionTitle: get(row, idx.completionTitle),
    action: get(row, idx.action),
    text: get(row, idx.text),
    targets: idx.choiceTarget.map(i => get(row, i)).filter(Boolean),
  });
}
if (badCols > 5) errors.push(`[结构] 另有 ${badCols - 5} 行列数不符，未逐行列出`);

// ── 1. ID：重复 / 缺口 / choice target 悬空 ──
const idSet = new Set();
const dup = new Set();
for (const e of events) {
  if (!e.id) { errors.push(`[ID] 第 ${e.lineNo} 行 ID 为空`); continue; }
  if (idSet.has(e.id)) dup.add(e.id);
  idSet.add(e.id);
}
if (dup.size > 0) errors.push(`[ID] 重复 ${dup.size} 个: ${[...dup].slice(0, 8).join(', ')}`);

const nums = [];
const presentNums = new Set();
for (const e of events) {
  const m = e.id.match(/_e(\d+)([a-d])?$/);
  if (!m) continue;
  presentNums.add(parseInt(m[1], 10));
  if (!m[2]) nums.push(parseInt(m[1], 10));
}
nums.sort((a, b) => a - b);
const uniqueNums = [...new Set(nums)];
const allNums = [...presentNums].sort((a, b) => a - b);
const missing = [];
if (allNums.length > 0) {
  for (let n = allNums[0]; n <= allNums[allNums.length - 1]; n++) {
    if (!presentNums.has(n)) missing.push(n);
  }
}
if (missing.length > 0) {
  const sample = missing.slice(0, 8).map(n => 'e' + String(n).padStart(4, '0')).join(', ');
  warns.push(`[ID] 编号缺口 ${missing.length} 个（多为号段预留；若是删行造成请确认）: ${sample}${missing.length > 8 ? ' …' : ''}`);
}

let danglingTargets = 0;
for (const e of events) {
  for (const t of e.targets) {
    if (!idSet.has(t)) {
      danglingTargets++;
      if (danglingTargets <= 5) errors.push(`[Choice] ${e.id} 的 target 悬空: ${t}`);
    }
  }
}
if (danglingTargets > 5) errors.push(`[Choice] 另有 ${danglingTargets - 5} 个 target 悬空`);

// ── 2. 分支链（共享 / 各分支 / 隐藏链），按 minSeconds 排序 ──
const dataBranches = [...new Set(events.map(e => e.branch).filter(Boolean))];
const branchOrder = [''];
for (const b of meta.branches) if (b !== 'hidden' && !branchOrder.includes(b)) branchOrder.push(b);
for (const b of dataBranches) if (b !== 'hidden' && !branchOrder.includes(b)) branchOrder.push(b);
if (dataBranches.includes('hidden') || meta.branches.includes('hidden')) branchOrder.push('hidden');

const chains = new Map();
for (const br of branchOrder) {
  const list = events.filter(e => e.branch === br).sort((a, b) => a.minSeconds - b.minSeconds);
  if (list.length > 0) chains.set(br, list);
}

// ── 3. Action 连续重复（同一分支链，跳过未填 Action 的行） ──
for (const [br, list] of chains) {
  const label = br === '' ? '共享' : br;
  let last = null;
  let streak = 0;
  let streakFrom = null;
  for (const e of list) {
    const a = (e.action || '').trim();
    if (!a) { last = null; streak = 0; continue; }
    if (a === last) {
      streak++;
      if (streak === 3) {
        errors.push(`[Action重复] ${label}: ${streakFrom} → ${e.id} 连续 ${streak}+ 段都是「${a}」`);
      }
    } else {
      last = a;
      streak = 1;
      streakFrom = e.id;
    }
  }
}

// ── 4. 结局：CompletionTitle 位置 + 链末文本 ──
const endings = [];
for (const [br, list] of chains) {
  const label = br === '' ? '共享' : br;
  const tail = list[list.length - 1];
  const tailSec = tail.minSeconds;
  for (const e of list) {
    if (e.completionTitle && e.minSeconds !== tailSec) {
      errors.push(`[结局] ${e.id} 有 CompletionTitle「${e.completionTitle}」但不在 ${label} 链末（链末 ${tail.id} @ ${fmtTime(tailSec)}，它在 ${fmtTime(e.minSeconds)}）`);
    }
    if (e.completionTitle) endings.push({ branch: label, id: e.id, title: e.completionTitle, at: e.minSeconds, text: e.text });
  }
  if (br === '') continue;   // 共享开篇链末是分支抉择，不做结局文本长度要求
  const len = (tail.text || '').length;
  if (len === 0) {
    errors.push(`[结局] ${label} 链末 ${tail.id} (${fmtTime(tailSec)}) 文本为空`);
  } else if (len < 20) {
    warns.push(`[结局] ${label} 链末 ${tail.id} (${fmtTime(tailSec)}) 文本过短 (${len} 字)`);
  }
  if (!list.some(e => e.completionTitle)) {
    warns.push(`[结局] ${label} 没有任何 CompletionTitle 事件（这个分支读完不会通关）`);
  }
}
for (const b of meta.branches) {
  if (b !== 'hidden' && !chains.has(b)) {
    warns.push(`[分支] frontmatter 声明了分支 ${b}，但 Events 表里一段都没有`);
  }
}

// ── 5. Type 分布（v4 只有 story） ──
const typeCount = {};
for (const e of events) typeCount[e.type] = (typeCount[e.type] || 0) + 1;
const nonStory = Object.keys(typeCount).filter(t => t !== 'story');
if (nonStory.length > 0) {
  warns.push(`[Type] 出现非 story 类型（v4 已取消 filler/定时事件）: ${nonStory.map(t => t + '×' + typeCount[t]).join(', ')}`);
}

// ── 输出 ──
console.log(`  文件: ${filePath}`);
console.log(`  副本: ${meta.name_cn || '(无 name_cn)'} (${meta.id || '(无 id)'})` +
  `    分支: ${meta.branches.length ? meta.branches.join(', ') : '(frontmatter 未声明)'}`);
console.log(`  Events 表: ${headers.length} 列 / ${events.length} 行    时间轴: ${timeMode}`);
console.log('');

console.log('  分支链（按 minSeconds 排序）:');
for (const [br, list] of chains) {
  const label = br === '' ? '共享' : br;
  const tail = list[list.length - 1];
  console.log(`    [${label}] ${list.length} 段  ${fmtTime(0)} → ${fmtTime(tail.minSeconds)}` +
    `    链末 ${tail.id}「${(tail.text || '').slice(0, 18)}${(tail.text || '').length > 18 ? '…' : ''}」` +
    (tail.completionTitle ? ` 结局标记「${tail.completionTitle}」` : ''));
}
console.log(`    Type 分布: ${Object.keys(typeCount).map(t => t + '×' + typeCount[t]).join(', ')}`);
console.log(`    ID: ${uniqueNums.length ? 'e' + String(uniqueNums[0]).padStart(4, '0') + '-e' + String(uniqueNums[uniqueNums.length - 1]).padStart(4, '0') : '(无)'}` +
  (missing.length ? `，缺口 ${missing.length} 个` : '，连续无缺口') +
  (dup.size ? `，重复 ${dup.size} 个` : ''));
console.log('');

if (endings.length > 0) {
  const byBranch = new Map();
  for (const e of endings) {
    if (!byBranch.has(e.branch)) byBranch.set(e.branch, []);
    byBranch.get(e.branch).push(e);
  }
  console.log(`  结局 ${endings.length} 个（每分支最多列 3 个，其余只看计数）:`);
  for (const [br, list] of byBranch) {
    const shown = list.slice(0, 3).map(e => `${e.id}「${e.title}」${(e.text || '').length}字`).join(', ');
    console.log(`    [${br}] ${list.length} 个: ${shown}${list.length > 3 ? ` … 另 ${list.length - 3} 个` : ''}`);
  }
  console.log('');
}

// 报告
if (errors.length === 0 && warns.length === 0) {
  console.log('  ✅ 校验通过，无问题');
  process.exit(0);
}

const failed = errors.length > 0 || (strict && warns.length > 0);
console.log(`  ${failed ? '⚠️' : '✅'} 发现 ${errors.length} 个 ERROR / ${warns.length} 个 WARN` +
  (errors.length === 0 && !strict ? '（仅 WARN，不影响退出码；要按失败处理加 --strict）' : ''));
for (const e of errors) console.log(`    ${e}`);
for (const w of warns) console.log(`    ${w}`);
console.log('');
process.exit(failed ? 1 : 0);

function reportAndExit() {
  console.log(`  文件: ${filePath}`);
  console.log(`  ${'⚠️'} 发现 ${errors.length} 个 ERROR`);
  for (const e of errors) console.log(`    ${e}`);
  console.log('');
  process.exit(1);
}
