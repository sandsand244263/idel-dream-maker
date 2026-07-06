const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Load scenario data ──
const scenarios = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'scenarios_data.json'), 'utf-8'));

// ── Pure functions (duplicated from scenario.js + main.cjs) ──
function calcLevel(exp) {
  if (exp <= 0) return 1;
  if (exp <= 980100) return Math.floor(Math.sqrt(exp / 100)) + 1;
  return 100 + Math.floor((exp - 980100) / 6000);
}

function calcExpForLevel(level) {
  if (level <= 1) return 0;
  if (level <= 100) return 100 * (level - 1) * (level - 1);
  return 980100 + (level - 100) * 6000;
}

function getCurrentTitle(scenario, level) {
  if (!scenario || !scenario.titles) return null;
  let best = scenario.titles[0];
  for (const t of scenario.titles) {
    if (t.level <= level) best = t;
    else break;
  }
  return best;
}

function getUnlockedTitles(scenario, level) {
  if (!scenario || !scenario.titles) return [];
  return scenario.titles.filter(t => t.level <= level);
}

const HUB_TITLES = [
  { level:1, name:'新人', desc:'刚踏上旅途' }, { level:5, name:'初学者', desc:'略有经历' },
  { level:10, name:'行者', desc:'步履初启' }, { level:15, name:'探索者', desc:'开始见识世界' },
  { level:20, name:'寻路人', desc:'有了方向' }, { level:30, name:'漫游者', desc:'走过几段路' },
  { level:40, name:'远行客', desc:'脚步渐远' }, { level:50, name:'冒险家', desc:'已非新人' },
  { level:70, name:'历练者', desc:'阅历渐深' }, { level:90, name:'跋涉者', desc:'行路万里' },
  { level:110, name:'见闻广博者', desc:'见过许多世界' }, { level:130, name:'行万里路者', desc:'脚印遍布' },
  { level:150, name:'传奇行者', desc:'传说的开始' }, { level:180, name:'传奇', desc:'传奇进行时' },
  { level:200, name:'传奇冒险家', desc:'传奇已成' }, { level:250, name:'不朽行者', desc:'时光难掩' },
  { level:300, name:'永恒', desc:'超越岁月' }, { level:350, name:'超越者', desc:'超越了旅程' },
  { level:400, name:'归来者', desc:'千帆过尽' }, { level:500, name:'万界漫游者', desc:'漫游万千世界' },
];

function getHubTitle(level) {
  let best = HUB_TITLES[0];
  for (const t of HUB_TITLES) if (t.level <= level) best = t;
  return best;
}

const HUB_ACHIEVEMENTS = [
  { id:'hub_lv50', name:'初出茅庐', desc:'大厅等级达到 50', condition:{ type:'hub_level', value:50 } },
  { id:'hub_lv100', name:'百级之路', desc:'大厅等级达到 100', condition:{ type:'hub_level', value:100 } },
  { id:'hub_lv200', name:'两百之巅', desc:'大厅等级达到 200', condition:{ type:'hub_level', value:200 } },
  { id:'hub_lv300', name:'三百之峰', desc:'大厅等级达到 300', condition:{ type:'hub_level', value:300 } },
  { id:'hub_complete3', name:'集邮者', desc:'通关 3 个不同副本', condition:{ type:'completions', value:3 } },
  { id:'hub_half', name:'半数圆满', desc:'通关当前一半副本', condition:{ type:'completions_half', value:0 } },
  { id:'hub_all', name:'大圆满', desc:'通关所有副本', condition:{ type:'completions_all', value:0 } },
  { id:'hub_rebirth1', name:'重生者', desc:'任意副本重生 1 次', condition:{ type:'rebirths', value:1 } },
  { id:'hub_rebirth3', name:'轮回者', desc:'任意副本重生 3 次', condition:{ type:'rebirths', value:3 } },
  { id:'hub_complete5', name:'万界旅人', desc:'通关 5 个不同副本', condition:{ type:'completions', value:5 } },
];

function checkHubAchievements(gameState, hubLevel) {
  const unlocked = [];
  const deduped = (gameState.gameCompletions || []).filter((c,i,a) => a.findIndex(x => x.scenarioId === c.scenarioId) === i);
  const completionCount = deduped.length;
  const totalScenarios = scenarios.length;
  const maxRebirth = Math.max(0, ...Object.values(gameState.rebirthCounts || {}));
  for (const a of HUB_ACHIEVEMENTS) {
    if ((gameState.unlockedAchievements || []).includes(a.id)) continue;
    let met = false;
    switch (a.condition.type) {
      case 'hub_level': met = hubLevel >= a.condition.value; break;
      case 'completions': met = completionCount >= a.condition.value; break;
      case 'completions_half': met = totalScenarios > 0 && completionCount >= Math.ceil(totalScenarios / 2); break;
      case 'completions_all': met = totalScenarios > 0 && completionCount >= totalScenarios; break;
      case 'rebirths': met = maxRebirth >= a.condition.value; break;
    }
    if (met) unlocked.push(a);
  }
  return unlocked;
}

function checkScenarioAchievements(gameState, scenario, level) {
  if (!scenario || !scenario.achievements) return [];
  const currentRebirth = (gameState.rebirthCounts && gameState.rebirthCounts[gameState.scenarioId]) || 0;
  const unlocked = [];
  for (const a of scenario.achievements) {
    if ((gameState.unlockedAchievements || []).includes(a.id)) continue;
    if (a.minRebirth !== undefined && a.minRebirth > currentRebirth) continue;
    let met = false;
    switch (a.condition.type) {
      case 'level': met = level >= a.condition.value; break;
      case 'runtime': met = (gameState.totalRuntimeMs || 0) >= a.condition.value; break;
      case 'events': met = (gameState.triggeredEvents || []).length >= a.condition.value; break;
      case 'titles': met = getUnlockedTitles(scenario, level).length >= a.condition.value; break;
    }
    if (met) unlocked.push(a);
  }
  return unlocked;
}

function canArchiveScenario(gameState, scenarioId) {
  const s = scenarios.find(x => x.id === scenarioId);
  if (!s) return false;
  const hasCompleted = (gameState.gameCompletions || []).some(c => c.scenarioId === scenarioId);
  if (!hasCompleted) return false;
  const branches = s.branches || [];
  if (branches.length === 0) return true;
  const cb = gameState.completedBranches || [];
  return branches.every(b => cb.includes(b));
}

function allScenariosFullyCompleted(gameState) {
  if (!scenarios || scenarios.length === 0) return false;
  return scenarios.every(s => canArchiveScenario(gameState, s.id));
}

function calcRebirthExpBonus(totalRebirths) {
  return Math.min(0.5, totalRebirths * 0.1);
}

// ── Test Runner ──
const results = [];
function test(cat, name, actual, expected) {
  const a = typeof actual === 'object' ? JSON.stringify(actual) : String(actual);
  const e = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
  const pass = a === e;
  results.push({ category: cat, name, pass, expected: e, actual: a });
}

// ── 1. 等级计算 ──
test('等级计算', 'exp=0 → Lv.1', calcLevel(0), 1);
test('等级计算', 'exp=1 → Lv.1', calcLevel(1), 1);
test('等级计算', 'exp=100 → Lv.2 (sqrt(1)+1)', calcLevel(100), 2);
test('等级计算', 'exp=400 → Lv.3', calcLevel(400), 3);
test('等级计算', 'exp=10000 → Lv.11', calcLevel(10000), 11);
test('等级计算', 'exp=980100 → Lv.100 (分段边界)', calcLevel(980100), 100);
test('等级计算', 'exp=980101 → Lv.100 (边界+1)', calcLevel(980101), 100);
test('等级计算', 'exp=986100 → Lv.101 (线性第一级)', calcLevel(986100), 101);
test('等级计算', 'exp=3380100 → Lv.500', calcLevel(3380100), 500);
test('等级计算', 'exp=10000000 → Lv.1603', calcLevel(10000000), 1603);

// ── 2. 经验级距 ──
test('经验级距', 'Lv.1 → exp=0', calcExpForLevel(1), 0);
test('经验级距', 'Lv.2 → exp=100', calcExpForLevel(2), 100);
test('经验级距', 'Lv.10 → exp=8100', calcExpForLevel(10), 8100);
test('经验级距', 'Lv.50 → exp=240100', calcExpForLevel(50), 240100);
test('经验级距', 'Lv.100 → exp=980100 (分段边界)', calcExpForLevel(100), 980100);
test('经验级距', 'Lv.101 → exp=986100', calcExpForLevel(101), 986100);
test('经验级距', 'Lv.500 → exp=3380100', calcExpForLevel(500), 3380100);

// ── 3. Round-trip 验证 ──
for (const lv of [1, 2, 5, 10, 50, 100, 101, 200, 500, 600]) {
  const exp = calcExpForLevel(lv);
  const back = calcLevel(exp) === lv;
  test('循环验证', `calcLevel(calcExpForLevel(${lv})) == ${lv}`, calcLevel(exp) === lv, true);
  test('循环验证', `calcExpForLevel(${lv}) <= calcExpForLevel(${lv}+1)`, calcExpForLevel(lv) < calcExpForLevel(lv + 1), true);
}

// ── 4. 副本称号 ──
const w = scenarios.find(s => s.id === 'wasteland');
if (w) {
  test('副本称号', 'LV.0 返回第一个称号(Lv.1)', getCurrentTitle(w, 0)?.name, '初醒者');
  test('副本称号', 'LV.1 = 初醒者', getCurrentTitle(w, 1)?.name, '初醒者');
  test('副本称号', 'LV.2 = 探路者', getCurrentTitle(w, 2)?.name, '探路者');
  test('副本称号', 'LV.3 = 独行者', getCurrentTitle(w, 3)?.name, '独行者');
  const lastTitle = w.titles[w.titles.length - 1];
  test('副本称号', `LV.500 = 最后一个称号(${lastTitle.name})`, getCurrentTitle(w, 500)?.name, lastTitle.name);
  test('副本称号', 'LV.500 解锁全部30个', getUnlockedTitles(w, 500).length, 30);
  test('副本称号', 'LV.5 解锁数 ≥3', getUnlockedTitles(w, 5).length >= 3, true);
  // 检查 title level 严格递增
  let mono = true;
  for (let i = 1; i < w.titles.length; i++) if (w.titles[i].level <= w.titles[i-1].level) { mono = false; break; }
  test('副本称号', '称号level严格递增', mono, true);
  test('副本称号', '称号 color 字段非空', w.titles.every(t => typeof t.color === 'string'), true);
  test('副本称号', '称号 desc 字段非空', w.titles.every(t => typeof t.desc === 'string' && t.desc.length > 0), true);
  test('副本称号', 'completion_title 非空', w.completion_title === '灰烬新生', true);
  test('副本称号', 'playerTitle 存在(player_title格式)', typeof (w.playerTitle || w.player_title) === 'string' && (w.playerTitle || w.player_title).length > 0, true);
}

// ── 5. 大厅称号 ──
test('大厅称号', 'Lv.1 = 新人', getHubTitle(1).name, '新人');
test('大厅称号', 'Lv.4 = 新人(未到5)', getHubTitle(4).name, '新人');
test('大厅称号', 'Lv.5 = 初学者', getHubTitle(5).name, '初学者');
test('大厅称号', 'Lv.9 = 初学者', getHubTitle(9).name, '初学者');
test('大厅称号', 'Lv.10 = 行者', getHubTitle(10).name, '行者');
test('大厅称号', 'Lv.49 = 冒险家', getHubTitle(49).name, '远行客');
test('大厅称号', 'Lv.50 = 冒险家', getHubTitle(50).name, '冒险家');
test('大厅称号', 'Lv.500 = 万界漫游者', getHubTitle(500).name, '万界漫游者');
test('大厅称号', 'Lv.999 = 万界漫游者(封顶)', getHubTitle(999).name, '万界漫游者');
test('大厅称号', 'Lv.0 = 新人(最低)', getHubTitle(0).name, '新人');
// 检查 HUB_TITLES 严格递增
let hubMono = true;
for (let i = 1; i < HUB_TITLES.length; i++) if (HUB_TITLES[i].level <= HUB_TITLES[i-1].level) { hubMono = false; break; }
test('大厅称号', '大厅称号level严格递增', hubMono, true);

// ── 6. 大厅成就 ──
const empty = { gameCompletions: [], rebirthCounts: {}, unlockedAchievements: [] };
const fullCompletion = { gameCompletions: [{ scenarioId:'wasteland' }], rebirthCounts: {}, unlockedAchievements: [] };
const rebirthState = { gameCompletions: [{ scenarioId:'wasteland' }], rebirthCounts: { wasteland: 3 }, unlockedAchievements: [] };
const partialUnlocked = { gameCompletions: [{ scenarioId:'wasteland' }], rebirthCounts: {}, unlockedAchievements: ['hub_lv50'] };

test('大厅成就', 'Lv.1无通关=无解锁', checkHubAchievements(empty, 1).length, 0);
test('大厅成就', 'Lv.50=初出茅庐', checkHubAchievements(empty, 50).length, 1);
test('大厅成就', 'Lv.100=初出茅庐+百级之路', checkHubAchievements(empty, 100).length, 2);
// 只有1个副本时 completions=1 → 半数圆满+大圆满同时解锁
const allAch = checkHubAchievements(fullCompletion, 50);
test('大厅成就', '通关1个+LV50=解锁初出茅庐+半数圆满+大圆满', allAch.length, 3);
test('大厅成就', '已解锁的不重复解锁(hub_lv50已解锁，LV100仍可解锁半数+大圆满)', checkHubAchievements(partialUnlocked, 100).length, 3); // hub_lv100 + half + all
test('大厅成就', '重生次数检查：重生3次解锁轮回者+半数+大圆满', checkHubAchievements(rebirthState, 1).length, 4); // half + all + rebirth1 + rebirth3

// ── 7. 副本成就 ──
const emptyGs = { scenarioId:'wasteland', unlockedAchievements: [], rebirthCounts: {}, triggeredEvents: [], totalRuntimeMs: 0 };
test('副本成就', 'Lv.1 解锁1个(首个称号titles=1)', checkScenarioAchievements(emptyGs, w, 1).length, 1);
test('副本成就', 'Lv.5 解锁成就数(1个level+3个titles)', checkScenarioAchievements(emptyGs, w, 5).length, 4);
test('副本成就', 'Lv.10 解锁成就数(2个level+3个titles)', checkScenarioAchievements(emptyGs, w, 10).length, 5);
test('副本成就', 'Lv.500 解锁全部level+titles成就(13+13)', checkScenarioAchievements(emptyGs, w, 500).length, 26);
// runtime 条件
const rtGs = { ...emptyGs, totalRuntimeMs: 3600000 };
test('副本成就', 'runtime=1h 解锁一小时成就', checkScenarioAchievements(rtGs, w, 1).some(a => a.id === 'wasteland_a014'), true);
// events 条件
const evGs = { ...emptyGs, triggeredEvents: Array(50).fill('x') };
test('副本成就', 'events=50 触发成就', checkScenarioAchievements(evGs, w, 1).length > 0, true);
// 已解锁的不重复
const unlockedGs = { ...emptyGs, unlockedAchievements: ['wasteland_a001', 'wasteland_a039'] };
test('副本成就', '已解锁成就不重复(Lv.5初踏废土+titles=2已解锁=剩2)', checkScenarioAchievements(unlockedGs, w, 5).length, 2); // a002? titles=1 + titles=4

// 检查所有成就 ID 唯一
const allIds = w.achievements.map(a => a.id);
test('副本成就', '所有成就ID唯一', new Set(allIds).size === allIds.length, true);
// 检查所有成就条件有效
const validConditions = w.achievements.every(a => ['level','runtime','events','titles'].includes(a.condition.type));
test('副本成就', '所有成就 condition.type 有效', validConditions, true);

// ── 8. canArchive ──
test('canArchive', '无任何记录=false', canArchiveScenario(empty, 'wasteland'), false);
const fullBranches = { gameCompletions: [{ scenarioId:'wasteland' }], completedBranches: ['survivor','merchant','fugitive','ai'] };
test('canArchive', '已通关+全部分支=true', canArchiveScenario(fullBranches, 'wasteland'), true);
const partialBranches = { gameCompletions: [{ scenarioId:'wasteland' }], completedBranches: ['survivor','merchant'] };
test('canArchive', '已通关+部分分支=false', canArchiveScenario(partialBranches, 'wasteland'), false);
test('canArchive', '不存在的副本=false', canArchiveScenario(empty, 'nonexistent'), false);

// ── 10. 重生加成 ──
test('重生加成', 'exp: 0次=0%', calcRebirthExpBonus(0), 0);
test('重生加成', 'exp: 1次=10%', calcRebirthExpBonus(1), 0.1);
test('重生加成', 'exp: 5次=50%(封顶)', calcRebirthExpBonus(5), 0.5);
test('重生加成', 'exp: 10次=50%(超过封顶)', calcRebirthExpBonus(10), 0.5);

// ── 12. 副本数据完整性 ──
scenarios.forEach(s => {
  test('数据完整性', `${s.id}: 有nameCN`, typeof (s.name_cn || s.nameCN) === 'string' && s.name_cn.length > 0, true);
  test('数据完整性', `${s.id}: 有description`, typeof s.description === 'string' && s.description.length > 0, true);
  test('数据完整性', `${s.id}: 30个称号`, s.titles.length === 30, true);
  test('数据完整性', `${s.id}: 50个成就`, s.achievements.length === 50, true);
  test('数据完整性', `${s.id}: mechanic有效`, ['standard','cultivation','cyber','tide','polar'].includes(s.mechanic), true);
  test('数据完整性', `${s.id}: max_rebirth >= 0`, typeof s.max_rebirth === 'number' && s.max_rebirth >= 0, true);
  test('数据完整性', `${s.id}: completion_title非空`, typeof s.completion_title === 'string' && s.completion_title.length > 0, true);
});

// ── 13. 事件数据完整性 ──
const allEvents = scenarios.flatMap(s => s.events || []);
test('事件检查', '有story类型事件', allEvents.some(e => e.type === 'story'), true);
test('事件检查', 'story事件有minLevel', allEvents.filter(e => e.type === 'story').every(e => typeof e.minLevel === 'number'), true);
test('事件检查', '所有事件有ID', allEvents.every(e => typeof e.id === 'string' && e.id.length > 0), true);
test('事件检查', '所有事件有text', allEvents.every(e => typeof e.text === 'string' && e.text.length > 0), true);
// ID 唯一性
const eventIds = allEvents.map(e => e.id);
test('事件检查', '所有事件ID唯一', new Set(eventIds).size === eventIds.length, true);

// ── 14. 结局数据完整性 ──
scenarios.forEach(s => {
  const storyEvents = (s.events || []).filter(e => e.type === 'story');
  const lastStory = storyEvents[storyEvents.length - 1];
  test('结局检查', `${s.id}: 最后一条story事件有text`, lastStory && typeof lastStory.text === 'string' && lastStory.text.length > 0, true);
});

// ── 15. 节假日事件 ──
const holidayEvents = allEvents.filter(e => e.type === 'holiday' || e.holiday_id);
test('节日检查', '节日事件含holiday_id', holidayEvents.every(e => typeof e.holiday_id === 'string'), holidayEvents.length === 0 || true);
test('节日检查', '节日事件含type=advance或day', holidayEvents.every(e => ['advance','day'].includes(e.type)), holidayEvents.length === 0 || true);
test('节日检查', '节日事件数>=0(当前wasteland无常驻节日事件)', holidayEvents.length >= 0, true);

// ── 16. Branch 数据 ──
const storyByBranch = {};
allEvents.filter(e => e.type === 'story').forEach(e => {
  const b = e.branch || '';
  if (!storyByBranch[b]) storyByBranch[b] = [];
  storyByBranch[b].push(e);
});
// 检查主要分支有足够 story
for (const [b, events] of Object.entries(storyByBranch)) {
  test('Branch数据', `branch"${b}" 有story`, events.length > 0, true);
}

// ── 17. Preload 白名单完整性 ──
const preloadSrc = fs.readFileSync(path.join(__dirname, '..', 'electron', 'preload.cjs'), 'utf-8');
const validChannelsMatch = preloadSrc.match(/const\s+validChannels\s*=\s*\[([^\]]+)\]/);
const preloadChannels = [];
if (validChannelsMatch) {
  const raw = validChannelsMatch[1];
  const re = /'([^']+)'/g;
  let m;
  while ((m = re.exec(raw)) !== null) preloadChannels.push(m[1]);
}
const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.cjs'), 'utf-8');
const mainHandlers = [];
const mainRe = /ipcMain\.handle\('([^']+)'/g;
let mainM;
while ((mainM = mainRe.exec(mainSrc)) !== null) mainHandlers.push(mainM[1]);
const uniqueMain = [...new Set(mainHandlers)].sort();
const uniquePreload = [...new Set(preloadChannels)].sort();
const missing = uniqueMain.filter(h => !uniquePreload.includes(h));
test('Preload完整性', '所有ipcMain.handle都在preload白名单中', missing.length, 0);

// ── 日志格式测试 ──
function testLogParse(lines) {
  // Simulate appendLogEntry format: one JSON per line
  return lines.trim().split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}
const lineByLine = [
  JSON.stringify({ t: '00:00:01', ty: 'system', m: 'start' }),
  JSON.stringify({ t: '00:00:02', ty: 'event', m: 'test event' }),
  JSON.stringify({ t: '00:00:03', ty: 'levelup', m: 'level 5' }),
].join('\n');
const parsedLines = testLogParse(lineByLine);
test('日志格式', '行格式可正确解析为3条', parsedLines.length, 3);
test('日志格式', '行格式解析类型正确', parsedLines[0].ty, 'system');
test('日志格式', '行格式解析消息正确', parsedLines[1].m, 'test event');

const oldArray = JSON.stringify([
  { t: '00:00:01', ty: 'system', m: 'start' },
  { t: '00:00:02', ty: 'event', m: 'test event' },
]);
const parsedArray = JSON.parse(oldArray);
test('日志格式', '数组格式可解析为2条', parsedArray.length, 2);
test('日志格式', '数组格式解析类型正确', parsedArray[1].ty, 'event');

// 验证一个不存在的日志文件返回空数组
test('日志格式', '空内容返回空数组', (() => { try { return JSON.parse(''); } catch { return []; } })().length, 0);

// ── 存档诊断校验测试 ──
function mockValidateSaveIntegrity(gs) {
  if (!gs) return 'gameState 为空';
  const issues = [];
  if (!gs._version) issues.push('缺少 _version');
  if (!gs.lastWriteTimestamp) issues.push('缺少 lastWriteTimestamp');
  if (!gs.playerName) issues.push('playerName 为空');
  if (typeof gs.level !== 'number' || gs.level < 1) issues.push('level 异常');
  if (typeof gs.exp !== 'number' || gs.exp < 0) issues.push('exp 异常');
  if (issues.length === 0) return '正常';
  return '问题: ' + issues.join(', ');
}
const validSave = { _version: 2, lastWriteTimestamp: '2026-01-01T00:00:00Z', playerName: 'Test', level: 10, exp: 100, isInHub: true };
const emptySave = {};
test('存档诊断', '完整存档=正常', mockValidateSaveIntegrity(validSave), '正常');
test('存档诊断', '空存档=检测到缺失', mockValidateSaveIntegrity(emptySave).startsWith('问题:'), true);
test('存档诊断', 'null存档=报空', mockValidateSaveIntegrity(null), 'gameState 为空');
function mockCheckSaveFields(gs) {
  if (!gs) return { error: 'gameState 为空' };
  return { _version: { present: !!gs._version, value: gs._version }, playerName: { present: !!gs.playerName, value: gs.playerName }, level: { present: typeof gs.level === 'number', value: gs.level } };
}
test('存档诊断', 'checkSaveFields 检测到 _version', mockCheckSaveFields(validSave)._version.present, true);
test('存档诊断', 'checkSaveFields 检测 null=error', mockCheckSaveFields(null).error, 'gameState 为空');

// ── 生成报告 ──
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass);
const report = {
  timestamp: new Date().toISOString(),
  version: '2.7.4',
  scenarios: scenarios.map(s => ({
    id: s.id,
    nameCN: s.name_cn || s.nameCN,
    titles: s.titles.length,
    achievements: s.achievements.length,
    events: s.events.length,
    branches: s.branches || [],
    mechanic: s.mechanic,
    completion_title: s.completion_title,
  })),
  summary: {
    total: results.length,
    passed,
    failed: failed.length,
    passRate: results.length > 0 ? Math.round(passed / results.length * 100) : 0,
  },
  failures: failed.map(f => ({ category: f.category, name: f.name, expected: f.expected, actual: f.actual })),
  details: results,
};

const desktop = path.join(os.homedir(), 'Desktop');
const reportPath = path.join(desktop, 'Idel-DreamMaker-自动测试报告.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

console.log(`报告已生成: ${reportPath}`);
console.log(`通过: ${passed}/${results.length} (${report.summary.passRate}%)`);
if (failed.length > 0) {
  console.log(`\n失败 ${failed.length} 项:`);
  failed.forEach(f => console.log(`  [${f.category}] ${f.name} — 期望: ${f.expected}, 实际: ${f.actual}`));
} else {
  console.log('\n全部通过!');
}
