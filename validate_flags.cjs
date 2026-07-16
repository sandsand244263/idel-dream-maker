/**
 * validate_flags.cjs — 检查副本中所有 FlagSet 是否有后续 FlagRequire 引用
 *
 * 规则：旗标抉择设的 flag 必须被至少一个 FlagRequire 引用。
 *
 * 用法：node validate_flags.cjs [scenarioId]
 * 示例：node validate_flags.cjs wasteland
 *       不传参数则检查所有副本
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'public', 'scenarios_data.json');
if (!fs.existsSync(dataPath)) {
  console.error('未找到 scenarios_data.json，请先运行 node build.js');
  process.exit(1);
}

const scenarios = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const targetId = process.argv[2];

const toCheck = targetId
  ? scenarios.filter(s => s.id === targetId)
  : scenarios;

if (targetId && toCheck.length === 0) {
  console.error('未找到副本: ' + targetId);
  process.exit(1);
}

let anyIssue = false;

for (const scenario of toCheck) {
  const { id, name_cn, events } = scenario;
  if (!events || events.length === 0) continue;

  // Collect all flag sets
  const flags = {};
  for (const e of events) {
    if (!e.flagSet) continue;
    for (const f of e.flagSet.split(';')) {
      const name = f.split(/[=+\-]/)[0].trim();
      if (!name) continue;
      if (!flags[name]) flags[name] = { sets: [], refs: [] };
      flags[name].sets.push({
        id: e.id,
        level: e.minLevel || 0,
        branch: e.branch || '(shared)',
        text: (e.text || '').slice(0, 30),
      });
    }
  }

  // Collect all flag references
  for (const e of events) {
    if (!e.flagRequire) continue;
    for (const r of e.flagRequire.split(/[&|]/)) {
      const name = r.split(/[>=<!]/)[0].trim();
      if (name && flags[name]) {
        flags[name].refs.push({
          id: e.id,
          level: e.minLevel || 0,
          branch: e.branch || '(shared)',
        });
      }
    }
  }

  // Print report per branch
  const branchMap = {};
  for (const [name, info] of Object.entries(flags)) {
    for (const set of info.sets) {
      const br = set.branch === '(shared)' ? '_shared' : set.branch;
      if (!branchMap[br]) branchMap[br] = { ok: [], orphan: [] };
      const entry = { flag: name, setAt: set.id + ' (Lv.' + set.level + ')', refCount: info.refs.length, refs: info.refs };
      if (info.refs.length === 0) {
        branchMap[br].orphan.push(entry);
        anyIssue = true;
      } else {
        branchMap[br].ok.push(entry);
      }
    }
  }

  console.log('\n========================================');
  console.log('  Flag 校验报告: ' + name_cn + ' (' + id + ')');
  console.log('========================================\n');

  for (const [branch, data] of Object.entries(branchMap)) {
    const brName = branch === '_shared' ? '共享' : branch;
    console.log('  [' + brName + '] 共 ' + (data.ok.length + data.orphan.length) + ' 个 flag' +
      (data.orphan.length > 0 ? '，其中 ' + data.orphan.length + ' 个孤立' : ''));

    if (data.orphan.length > 0) {
      for (const o of data.orphan) {
        const matchLevel = o.setAt.match(/Lv\.(\d+)/);
        const setLevel = matchLevel ? parseInt(matchLevel[1]) : 0;
        // Find next choice in same branch to estimate impact range
        const branchEvents = events.filter(e => !e.branch || e.branch === branch);
        const nextChoice = branchEvents.find(e =>
          e.choice1 && e.minLevel > setLevel
        );
        const endLevel = nextChoice ? Math.min(nextChoice.minLevel - 1, 499) : 499;
        const affectedCount = branchEvents.filter(e =>
          e.minLevel > setLevel && e.minLevel <= endLevel
        ).length;
        console.log('    ❌ ' + o.flag);
        console.log('       设置: ' + o.setAt);
        console.log('       影响: Lv.' + (setLevel + 1) + '-' + endLevel + '，共 ' + affectedCount + ' 个事件');
      }
    }

    if (data.ok.length > 0) {
      for (const o of data.ok) {
        const refIds = o.refs.map(r => r.id + '(Lv.' + r.level + ')').join(', ');
        console.log('    ✅ ' + o.flag + ' → 被 ' + o.refCount + ' 个事件引用: ' + refIds);
      }
    }
    console.log('');
  }

  const totalFlags = Object.keys(flags).length;
  const orphaned = Object.values(flags).filter(f => f.refs.length === 0).length;
  console.log('  合计: ' + totalFlags + ' 个 flag，' + orphaned + ' 个孤立\n');
}

if (anyIssue) {
  process.exit(0); // 不阻断流程，仅报告
}
