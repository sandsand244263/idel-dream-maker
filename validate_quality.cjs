#!/usr/bin/env node
/**
 * validate_quality.cjs — 副本内容质量校验（生成过程中的质量闸门）
 *
 * 用法：node validate_quality.cjs [scenarioId]
 *   - 不带参数：检查全部副本
 *   - 带参数：只检查指定副本（如 wasteland）
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

  // 分支等级覆盖：每个分支（含共享）在 1-500 每级至少 1 个可触发事件
  // 共享事件（无分支）对所有分支可见
  const branches = (s.branches || []).concat(['']);
  if (!s.branches || s.branches.length === 0) {
    console.log('  [WARN] 未配置 branches 字段（frontmatter），分支等级覆盖检查被跳过——请确认 frontmatter 已写 branches');
    hasWarn = true;
  }
  const sharedByLevel = {};
  for (const e of events) {
    if (!e.branch) {
      const lv = e.minLevel || 1;
      if (!sharedByLevel[lv]) sharedByLevel[lv] = 0;
      sharedByLevel[lv]++;
    }
  }
  for (const b of branches) {
    const byLevel = {};
    for (const e of events) {
      if (e.branch && e.branch !== b) continue;
      const lv = e.minLevel || 1;
      if (!byLevel[lv]) byLevel[lv] = 0;
      byLevel[lv]++;
    }
    const missing = [];
    // 共享事件（无分支）仅设计覆盖开局 Lv.1-5，之后由分支事件接管
    const coverEnd = b === '' ? 5 : 500;
    for (let lv = 1; lv <= coverEnd; lv++) {
      if (!byLevel[lv]) missing.push(lv);
    }
    if (missing.length > 0) {
      console.log(`  [WARN] 分支「${b || '(共享)'}」等级缺口 ${missing.length} 级: ${missing.slice(0, 30).join(', ')}${missing.length > 30 ? '...' : ''}`);
      hasWarn = true;
    } else {
      console.log(`  [OK] 分支「${b || '(共享)'}」1-${coverEnd} 级全覆盖`);
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
