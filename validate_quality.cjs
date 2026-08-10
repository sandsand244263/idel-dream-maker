#!/usr/bin/env node
/**
 * validate_quality.cjs — 副本内容质量校验（生成过程中的质量闸门）
 *
 * 用法：node validate_quality.cjs [scenarioId]
 *   - 不带参数：检查全部副本
 *   - 带参数：只检查指定副本（如 backrooms）
 *
 * 检查项：
 *   1. 事件 ID 连续性：主线事件编号（eXXXX，无 a/b/c/d 后缀）按出现顺序必须
 *      非降序（choice target 允许插队）；输出编号缺口（如 21, 51, 81）供内容补强
 *   2. 伏笔回收率：约定伏笔 flag 命名 `foreshadow_*`，检查每个伏笔是否被
 *      后续事件的 FlagRequire 引用（引用 = 已回收）；输出回收率与未回收列表
 *
 * 说明：
 *   - flag 引用链完整性由 validate_flags.cjs 负责（本脚本不重复检查）
 *   - 编号缺口输出为 [WARN]（内容缺口提示，不阻塞构建）
 *   - 伏笔未回收输出为 [WARN]（生成中段属正常，终稿时应为 0）
 *
 * 使用约定（写入 ScenarioWriter 规范）：
 *   - 伏笔 flag 命名：foreshadow_<含义>，如 foreshadow_gift
 *   - 回收：后续事件的 FlagRequire 引用同一 flag 名（如 foreshadow_gift=true）
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'public', 'scenarios_data.json');
const scenarioId = process.argv[2];

function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error('[ERROR] public/scenarios_data.json 不存在，请先运行 node build.js');
    process.exit(1);
  }
  const scenarios = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const targets = scenarioId ? scenarios.filter(s => s.id === scenarioId) : scenarios;
  if (targets.length === 0) {
    console.error(`[ERROR] 找不到副本: ${scenarioId}`);
    process.exit(1);
  }

  let allPass = true;
  for (const s of targets) {
    console.log('========================================');
    console.log(`  质量校验: ${s.name_cn} (${s.id})`);
    console.log('========================================');
    const ok = checkScenario(s);
    if (!ok) allPass = false;
    console.log('');
  }

  console.log(allPass ? '全部通过' : '存在警告，见上方输出');
  process.exit(allPass ? 0 : 1);
}

function checkScenario(s) {
  let hasWarn = false;
  const events = s.events || [];

  // ── 1. 事件 ID 规则 + 分支等级覆盖缺口 ──
  const mainIds = [];
  const allIds = new Set(events.map(e => e.id));
  for (const e of events) {
    const m = e.id.match(/_e(\d{4})$/); // 主线事件：编号后无字母
    if (m) mainIds.push(parseInt(m[1], 10));
  }
  let seen = new Set();
  let prev = null;
  let idError = false;
  for (const n of mainIds) {
    if (seen.has(n)) {
      console.log(`  [ERROR] 事件编号重复: e${String(n).padStart(4, '0')}`);
      idError = true;
    }
    seen.add(n);
    if (prev !== null && n < prev) {
      console.log(`  [ERROR] 事件编号倒退: e${String(prev).padStart(4, '0')} → e${String(n).padStart(4, '0')}`);
      idError = true;
    }
    prev = n;
  }
  if (!idError) console.log('  [OK] 事件编号无重复、无倒退');

  // 分支时长覆盖（v4）：每个分支（含共享）在 MinSeconds 时间轴上连续覆盖
  // 规则：相邻事件间隔 ≤ 120 分钟（防长空白）；分支末尾必须有结局事件（CompletionTitle）
  const branches = (s.branches || []).concat(['']);
  if (!s.branches || s.branches.length === 0) {
    console.log('  [WARN] 未配置 branches 字段（frontmatter），分支时长覆盖检查被跳过——请确认 frontmatter 已写 branches');
    hasWarn = true;
  }
  const GAP_LIMIT = 120 * 60;  // 相邻事件最大间隔 120 分钟
  for (const b of branches) {
    const evs = events
      .filter(e => e.branch === b || (b === '' && !e.branch))
      .sort((a, z) => (a.minSeconds || 0) - (z.minSeconds || 0));
    // 共享段只要求开局连续性（到首个分支抉择），分支段要求全程
    if (evs.length === 0) {
      console.log(`  [WARN] 分支「${b || '(共享)'}」无事件`);
      hasWarn = true;
      continue;
    }
    const gaps = [];
    for (let i = 1; i < evs.length; i++) {
      const gap = (evs[i].minSeconds || 0) - (evs[i - 1].minSeconds || 0);
      if (gap > GAP_LIMIT) gaps.push({ from: evs[i - 1].id, to: evs[i].id, gapMin: Math.round(gap / 60) });
    }
    if (gaps.length > 0) {
      console.log(`  [WARN] 分支「${b || '(共享)'}」时间轴空白 ${gaps.length} 处（>120 分钟）: ${gaps.slice(0, 5).map(g => `${g.from}→${g.to}(${g.gapMin}分)`).join(', ')}`);
      hasWarn = true;
    } else {
      console.log(`  [OK] 分支「${b || '(共享)'}」时间轴连续（${evs.length} 段，跨度 ${Math.round((evs[evs.length - 1].minSeconds || 0) / 3600)} 小时）`);
    }
  }

  // ── 1.5 结局事件校验（v4）：CompletionTitle 有值 = 结局，必须位于分支链末尾 ──
  const endings = events.filter(e => e.completionTitle);
  if (endings.length === 0) {
    console.log('  [WARN] 无结局事件（CompletionTitle 列无值）——每个分支必须有一个结局');
    hasWarn = true;
  } else {
    let endingOk = true;
    for (const e of endings) {
      const sameBranch = events.filter(x => (x.branch || '') === (e.branch || ''));
      const maxSec = Math.max(...sameBranch.map(x => x.minSeconds || 0));
      if ((e.minSeconds || 0) !== maxSec) {
        console.log(`  [ERROR] 结局 ${e.id} 不在分支「${e.branch || '(共享)'}」链末尾（链末 ${Math.round(maxSec / 60)} 分钟，结局在 ${Math.round((e.minSeconds || 0) / 60)} 分钟）`);
        endingOk = false;
      }
    }
    if (endingOk) console.log(`  [OK] ${endings.length} 个结局事件均位于分支链末尾`);
    if (!endingOk) hasWarn = true;
  }

  // ── 1.6 隐藏链校验（v4）：Branch='hidden' 事件独立成链，时间轴连续 ──
  const hiddenEvents = events.filter(e => e.branch === 'hidden');
  if (hiddenEvents.length > 0) {
    const hs = [...hiddenEvents].sort((a, z) => (a.minSeconds || 0) - (z.minSeconds || 0));
    const hGaps = [];
    for (let i = 1; i < hs.length; i++) {
      const gap = (hs[i].minSeconds || 0) - (hs[i - 1].minSeconds || 0);
      if (gap > GAP_LIMIT) hGaps.push(`${hs[i - 1].id}→${hs[i].id}(${Math.round(gap / 60)}分)`);
    }
    if (hGaps.length > 0) {
      console.log(`  [WARN] 隐藏链时间轴空白 ${hGaps.length} 处: ${hGaps.slice(0, 5).join(', ')}`);
      hasWarn = true;
    } else {
      console.log(`  [OK] 隐藏链连续（${hs.length} 段，跨度 ${Math.round((hs[hs.length - 1].minSeconds || 0) / 3600)} 小时）`);
    }
    if (!hiddenEvents.some(e => e.completionTitle)) {
      console.log('  [WARN] 隐藏链无结局事件（CompletionTitle）——收集向内容建议有收束');
      hasWarn = true;
    }
  }

  // ── 2. 伏笔回收率 ──
  const foreshadowFlags = new Set();
  const setterByFlag = {};
  for (const e of events) {
    if (!e.flagSet) continue;
    for (const part of e.flagSet.split(';')) {
      const m = part.trim().match(/^([a-zA-Z_]\w*)/);
      // 忽略 foreshadow_x=false（取消伏笔的写法，不算埋点）
      if (m && m[1].startsWith('foreshadow_') && !/=false\s*$/i.test(part.trim())) {
        foreshadowFlags.add(m[1]);
        setterByFlag[m[1]] = e.id;
      }
    }
  }
  if (foreshadowFlags.size === 0) {
    console.log('  [OK] 无伏笔（未使用 foreshadow_* flag）');
  } else {
    const referenced = new Set();
    for (const e of events) {
      if (!e.flagRequire) continue;
      for (const part of e.flagRequire.split(/[;&|]/)) {
        const m = part.trim().match(/^([a-zA-Z_]\w*)/);
        if (m && foreshadowFlags.has(m[1])) referenced.add(m[1]);
      }
    }
    const unrecovered = [...foreshadowFlags].filter(f => !referenced.has(f));
    const rate = Math.round((foreshadowFlags.size - unrecovered.length) / foreshadowFlags.size * 100);
    console.log(`  [${unrecovered.length === 0 ? 'OK' : 'WARN'}] 伏笔回收率: ${foreshadowFlags.size - unrecovered.length}/${foreshadowFlags.size} (${rate}%)`);
    for (const f of unrecovered) {
      console.log(`        未回收: ${f}（由 ${setterByFlag[f]} 设置）`);
    }
    if (unrecovered.length > 0) hasWarn = true;
  }

  // ── 3. choice target 完整性（兜底复查） ──
  let badTarget = 0;
  for (const e of events) {
    for (const t of [e.choice1Target, e.choice2Target, e.choice3Target, e.choice4Target]) {
      if (t && !allIds.has(t)) {
        console.log(`  [ERROR] ${e.id} 的 choice target 悬空: ${t}`);
        badTarget++;
      }
    }
  }
  if (badTarget === 0) {
    console.log('  [OK] choice target 全部存在');
  } else {
    hasWarn = true;
  }

  return !hasWarn;
}

main();
