#!/usr/bin/env node
/**
 * validate_flags.cjs — Flag 引用链校验（v4 口径：MinSeconds 时间轴 + 分支可达性）
 *
 * 用法：
 *   node validate_flags.cjs               检查全部副本
 *   node validate_flags.cjs backrooms     只检查指定副本（副本 id）
 *   node validate_flags.cjs --help        看用法
 *
 * 读 public/scenarios_data.json（build.js 产物），字段与 src/scenario-parser.cjs 一致：
 *   时间轴是 minSeconds（秒），v4 已无 minLevel —— 输出里的时间一律按 minSeconds 换算成 h/min。
 *   旧数据只有 minLevel 时按解析器同一规则换算：minSeconds = MinLevel × 600。
 *
 * 判定口径（分支可达性，v4 关键）：
 *   - 事件设了 flag，只有「同一分支」或「隐藏链」里有事件 FlagRequire 它，才算被消费。
 *     共享事件在分支抉择之前就跑完了，读不到分支 flag；别的分支更不会走这条线。
 *   - 同分支 0 引用、全篇也没人引用      → ❌ 孤立：设了没人用，这条线白写
 *   - 同分支 0 引用、只有别的分支引用    → ⚠️ 跨分支：本分支拿不到，别的分支也触发不了
 *   - FlagRequire 提到、全文没人设置     → ⚠️ 悬空引用：这个条件永远不成立
 *
 * 退出码：
 *   0  没有 ❌ 孤立 / 悬空引用（只有 ⚠️ 跨分支时也算通过）
 *   1  存在 ❌ 孤立或悬空引用；加了 --strict 时 ⚠️ 跨分支也算失败
 *   2  用法错误 / 数据缺失（scenarios_data.json 不存在、副本 id 找不到）
 *
 * 用法补充：node validate_flags.cjs [副本id] [--strict]
 */

const fs = require('fs');
const path = require('path');

const USAGE = [
  '用法: node validate_flags.cjs [副本id]',
  '  不带参数：检查全部副本',
  '  带参数  ：只检查指定副本，如 node validate_flags.cjs wasteland',
  '  --strict：把 ⚠️ 跨分支也当失败（默认只提示，不影响退出码）',
  '',
  '退出码: 0=没有 ❌（跨分支只提示）  1=有 ❌孤立/悬空引用（--strict 下含跨分支）  2=用法或数据错误',
].join('\n');

const DATA_PATH = path.join(__dirname, 'public', 'scenarios_data.json');
const argv = process.argv.slice(2);
// --strict：把 ⚠️ 跨分支也算失败。日常跑不加——已有内容里存在「故意只做记录」的跨分支设置点，
// 一律当失败会让这个脚本天天报红，反而没人看。
const STRICT = argv.includes('--strict');
const arg = argv.find(a => !a.startsWith('-'));

if (argv.includes('-h') || argv.includes('--help')) {
  console.log(USAGE);
  process.exit(0);
}
if (!fs.existsSync(DATA_PATH)) {
  console.error('[ERROR] 未找到 public/scenarios_data.json，请先运行 node build.js');
  process.exit(2);
}

let scenarios;
try {
  scenarios = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
} catch (err) {
  console.error('[ERROR] scenarios_data.json 解析失败: ' + err.message);
  process.exit(2);
}

const targetId = arg;
const toCheck = targetId ? scenarios.filter(s => s.id === targetId) : scenarios;
if (toCheck.length === 0) {
  console.error('[ERROR] 未找到副本: ' + targetId + '\n' + USAGE);
  process.exit(2);
}

// ── 解析工具（与渲染引擎 applyFlagSet / checkFlagRequire 的口径一致） ──
// FlagSet：';' 分隔，语法 键名[=|+=|-=]值 或裸键名
function parseFlagSet(expr) {
  const out = [];
  for (const part of String(expr).split(';')) {
    const t = part.trim();
    if (!t) continue;
    const m = t.match(/^([a-zA-Z_]\w*)/);
    if (m) out.push({ name: m[1], expr: t });
  }
  return out;
}

// FlagRequire：';' '&' = AND，'|' = OR；取每个原子条件的键名
function parseFlagRequire(expr) {
  const out = [];
  for (const andPart of String(expr).split(/[;&]/)) {
    for (const orPart of andPart.split('|')) {
      const t = orPart.trim();
      if (!t) continue;
      const m = t.match(/^([a-zA-Z_]\w*)/);
      if (m) out.push({ name: m[1], expr: t });
    }
  }
  return out;
}

function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  if (s < 3600) return Math.round(s / 60) + 'min';
  return (s / 3600).toFixed(1) + 'h';
}

function push(map, key, val) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(val);
}

function fmtRefList(list, limit) {
  const cap = limit || 5;
  const head = list.slice(0, cap).map(r => r.id + ' ' + fmtTime(r.sec)).join(', ');
  return list.length > cap ? head + ` … 共 ${list.length} 处` : head;
}

let anyIssue = false;
let anyCross = false;
const totals = { flags: 0, sets: 0, ok: 0, orphan: 0, cross: 0, dangling: 0 };

for (const scenario of toCheck) {
  const rawEvents = scenario.events || [];
  const declaredBranches = (scenario.branches || []).filter(Boolean);
  const setsMap = new Map();   // flag -> [{ id, branch, sec, expr }]
  const refsMap = new Map();   // flag -> [{ id, branch, sec, expr }]

  // 统一成 sec（秒）口径：v4 事件带 minSeconds；旧数据（v3 解析产物）只有 minLevel，
  // 按解析器同一规则 ×600 换算
  const events = rawEvents.map(e => ({
    ...e,
    branch: (e.branch || '').trim(),
    sec: Number.isFinite(e.minSeconds)
      ? e.minSeconds
      : (Number.isFinite(e.minLevel) ? (e.minLevel || 1) * 600 : 0),
  }));

  for (const e of events) {
    if (e.flagSet) {
      for (const f of parseFlagSet(e.flagSet)) push(setsMap, f.name, { id: e.id, branch: e.branch, sec: e.sec, expr: f.expr });
    }
    if (e.flagRequire) {
      for (const f of parseFlagRequire(e.flagRequire)) push(refsMap, f.name, { id: e.id, branch: e.branch, sec: e.sec, expr: f.expr });
    }
  }

  console.log('\n========================================');
  console.log('  Flag 校验报告: ' + (scenario.name_cn || scenario.id) + ' (' + scenario.id + ')');
  console.log('  口径: minSeconds 时间轴 / 同分支-隐藏链可达    事件 ' + events.length + ' 段');
  console.log('========================================\n');

  const flagNames = [...setsMap.keys()].sort();
  const dangling = [...refsMap.keys()].filter(f => !setsMap.has(f)).sort();

  if (flagNames.length === 0) {
    console.log('  本副本没有 FlagSet（未使用 flag 系统）');
    if (dangling.length > 0) {
      console.log(`  ⚠️ 但有 ${dangling.length} 个 FlagRequire 引用了从未设置的 flag: ${dangling.join(', ')}`);
      anyIssue = true;
      totals.dangling += dangling.length;
    }
    console.log('');
    continue;
  }

  // 分支展示顺序：共享 → frontmatter 顺序 → 数据里多出来的 → 隐藏链
  const dataBranches = [...new Set(events.map(e => (e.branch || '').trim()).filter(Boolean))];
  const branchOrder = [''];
  for (const b of declaredBranches) if (b !== 'hidden' && !branchOrder.includes(b)) branchOrder.push(b);
  for (const b of dataBranches) if (b !== 'hidden' && !branchOrder.includes(b)) branchOrder.push(b);
  if (dataBranches.includes('hidden') || declaredBranches.includes('hidden')) branchOrder.push('hidden');

  // 每条分支链按 sec 排序，用于算「影响范围」
  const chains = new Map();
  for (const br of branchOrder) {
    chains.set(br, events
      .filter(e => e.branch === br)
      .sort((a, b) => a.sec - b.sec));
  }

  // 每个设置点算一次可达性
  const rows = [];   // { flag, kind, set, consumers, otherRefs, tail, futureCount }
  for (const flag of flagNames) {
    const refs = refsMap.get(flag) || [];
    for (const set of setsMap.get(flag)) {
      const reachable = set.branch === ''
        ? refs                                                  // 共享事件：之后任何分支都能读
        : refs.filter(r => r.branch === set.branch || r.branch === 'hidden');
      const otherRefs = refs.filter(r => !reachable.includes(r));
      const chain = chains.get(set.branch) || [];
      const tail = chain.length ? chain[chain.length - 1].sec : set.sec;
      const futureCount = chain.filter(e => e.id !== set.id && e.sec >= set.sec).length;
      const kind = reachable.length > 0 ? 'ok' : (otherRefs.length > 0 ? 'cross' : 'orphan');
      rows.push({ flag, kind, set, consumers: reachable, otherRefs, tail, futureCount });
      totals.sets++;
      totals[kind === 'ok' ? 'ok' : kind]++;
      if (kind === 'orphan') anyIssue = true;
      else if (kind === 'cross') anyCross = true;
    }
  }

  for (const br of branchOrder) {
    const group = rows.filter(r => r.set.branch === br).sort((a, b) => a.set.sec - b.set.sec);
    if (group.length === 0) continue;
    const okN = group.filter(r => r.kind === 'ok').length;
    const orphanN = group.filter(r => r.kind === 'orphan').length;
    const crossN = group.filter(r => r.kind === 'cross').length;
    const flagCount = new Set(group.map(r => r.flag)).size;
    const label = br === '' ? '共享' : br;
    console.log(`  [${label}] ${flagCount} 个 flag / ${group.length} 个设置点` +
      `（${okN} ✅` + (orphanN ? ` / ${orphanN} ❌` : '') + (crossN ? ` / ${crossN} ⚠️` : '') + '）');

    for (const r of group) {
      if (r.kind === 'ok') {
        console.log(`    ✅ ${r.flag}`);
        console.log(`       设于 ${r.set.id} (${fmtTime(r.set.sec)}) → 同链 ${r.consumers.length} 处引用: ${fmtRefList(r.consumers)}`);
      } else if (r.kind === 'orphan') {
        console.log(`    ❌ ${r.flag}`);
        console.log(`       设于 ${r.set.id} (${fmtTime(r.set.sec)})，${label} 内没有任何事件 FlagRequire 它`);
        console.log(`       影响: ${fmtTime(r.set.sec)} → 链末 ${fmtTime(r.tail)}，该区间 ${r.futureCount} 段没有消费这个 flag 的分歧`);
        console.log('       处理: 补一段 FlagRequire，或删掉这个 FlagSet');
      } else {
        console.log(`    ⚠️ ${r.flag}（跨分支，等于没设）`);
        console.log(`       设于 ${r.set.id} (${fmtTime(r.set.sec)})，${label} 和隐藏链都没引用它`);
        const otherBranches = [...new Set(r.otherRefs.map(x => x.branch === '' ? '(共享)' : x.branch))].join('/');
        console.log(`       引用只在 ${otherBranches}（${r.otherRefs.length} 处）→ ${label} 这条线读不到`);
        console.log(`       影响: ${fmtTime(r.set.sec)} → 链末 ${fmtTime(r.tail)}，该区间 ${r.futureCount} 段`);
      }
    }
    console.log('');
  }

  // 悬空引用：FlagRequire 提到，全文没人设置
  if (dangling.length > 0) {
    totals.dangling += dangling.length;
    anyIssue = true;
    console.log(`  [悬空引用] ${dangling.length} 个 flag 被 FlagRequire 检查，但全文没有 FlagSet`);
    for (const f of dangling) {
      console.log(`    ⚠️ ${f} — 引用: ${fmtRefList(refsMap.get(f))}（条件永远不成立）`);
    }
    console.log('');
  }

  const orphanN = rows.filter(r => r.kind === 'orphan').length;
  const crossN = rows.filter(r => r.kind === 'cross').length;
  console.log(`  合计: ${flagNames.length} 个 flag，${rows.length} 个设置点 → ` +
    `${rows.length - orphanN - crossN} ✅ / ${orphanN} ❌孤立 / ${crossN} ⚠️跨分支；` +
    `悬空引用 ${dangling.length} 个`);
  totals.flags += flagNames.length;
}

// 多副本时的总账
if (toCheck.length > 1) {
  console.log('\n----------------------------------------');
  console.log(`  全部副本合计: ${totals.flags} 个 flag / ${totals.sets} 个设置点` +
    `（${totals.ok} ✅ / ${totals.orphan} ❌ / ${totals.cross} ⚠️），悬空引用 ${totals.dangling} 个`);
  console.log('----------------------------------------');
}

if (anyIssue || (STRICT && anyCross)) {
  const why = [anyIssue ? '❌ 孤立 / 悬空引用' : '', (STRICT && anyCross) ? '⚠️ 跨分支（--strict）' : ''].filter(Boolean).join(' + ');
  console.log(`\n存在需要处理的问题：${why} → 退出码 1`);
  process.exit(1);
}
if (anyCross) {
  console.log('\n只有 ⚠️ 跨分支设置点（不算失败；要按失败处理加 --strict），退出码 0');
} else {
  console.log('\n全部 ✅，退出码 0');
}
process.exit(0);
