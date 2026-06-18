import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCENARIOS_DIR = path.join(__dirname, 'scenarios');
const OUTPUT_PATH = path.join(__dirname, 'public', 'scenarios_data.json');

const COL_NORM = {
  'level': 'level', '等级': 'level',
  'name': 'name', '名称': 'name', '名字': 'name',
  'color': 'color', '颜色': 'color',
  'desc': 'desc', 'description': 'desc', '描述': 'desc',
  'id': 'id',
  'minlevel': 'minlevel', '最低等级': 'minlevel', 'min_level': 'minlevel', 'minLevel': 'minlevel',
  'minhours': 'minhours', '最低挂机小时数': 'minhours', 'min_hours': 'minhours', 'minHours': 'minhours',
  'weight': 'weight', '权重': 'weight',
  'once': 'once', '只触发一次': 'once',
  'minrebirth': 'minrebirth', 'min_rebirth': 'minrebirth', 'minRebirth': 'minrebirth', '最低重生': 'minrebirth',
  'text': 'text', '事件文本': 'text',
  'icon': 'icon', '图标': 'icon',
  'conditiontype': 'conditiontype', '条件类型': 'conditiontype', 'condition_type': 'conditiontype', 'conditionType': 'conditiontype',
  'conditionvalue': 'conditionvalue', '条件值': 'conditionvalue', 'condition_value': 'conditionvalue', 'conditionValue': 'conditionvalue',
  'type': 'type', '类型': 'type',
  'holidayid': 'holidayid', 'holiday_id': 'holidayid', 'holidayId': 'holidayid', '节日id': 'holidayid',
};

function normCol(name) {
  const n = name.trim().toLowerCase();
  return COL_NORM[n] || name;
}

function parseBool(s) {
  const v = s.trim().toLowerCase();
  return v === 'yes' || v === 'true' || v === '1' || v === 'y' || v === '是';
}

function extractFrontmatter(lines) {
  if (lines.length === 0 || lines[0].trim() !== '---') {
    throw new Error('Missing frontmatter delimiter (first line must be "---")');
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error("Missing closing '---' for frontmatter");
  return { yaml: lines.slice(1, end).join('\n'), bodyStart: end + 1 };
}

function findSection(lines, name) {
  const target = `## ${name}`;
  return lines.findIndex(l => l.trim() === target);
}

function nextSectionOrEnd(lines, start) {
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('## ')) return i;
  }
  return lines.length;
}

function parseTable(lines, start, end) {
  const rows = [];
  let inTable = false;
  for (let i = start; i < end; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|') || !line.endsWith('|')) {
      if (inTable) break;
      continue;
    }
    inTable = true;
    if (line.includes('---')) continue;
    const cells = line.slice(1, -1).split('|').map(c => c.trim());
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function parseTitles(bodyLines) {
  const secStart = findSection(bodyLines, 'Titles');
  if (secStart === -1) throw new Error("Missing '## Titles' section");
  const secEnd = nextSectionOrEnd(bodyLines, secStart);
  const rows = parseTable(bodyLines, secStart, secEnd);
  if (rows.length < 2) throw new Error('Titles table needs at least header + one row');

  const headers = rows[0].map(h => normCol(h).toLowerCase());
  const levelIdx = headers.indexOf('level');
  const nameIdx = headers.indexOf('name');
  const colorIdx = headers.indexOf('color');
  const descIdx = headers.indexOf('desc');
  if (levelIdx === -1) throw new Error("Titles table missing 'Level' column");
  if (nameIdx === -1) throw new Error("Titles table missing 'Name' column");
  if (colorIdx === -1) throw new Error("Titles table missing 'Color' column");
  if (descIdx === -1) throw new Error("Titles table missing 'Description' column");

  const maxIdx = Math.max(levelIdx, nameIdx, colorIdx, descIdx);
  const titles = [];
  for (const row of rows.slice(1)) {
    if (row.length <= maxIdx) continue;
    titles.push({
      level: parseInt(row[levelIdx], 10),
      name: row[nameIdx],
      color: row[colorIdx],
      desc: row[descIdx],
    });
  }

  for (let i = 1; i < titles.length; i++) {
    if (titles[i].level <= titles[i - 1].level) {
      throw new Error(`Titles not in ascending order: Lv.${titles[i].level} after Lv.${titles[i - 1].level}`);
    }
  }
  if (titles.length < 5) {
    throw new Error(`Need at least 5 titles, got ${titles.length}`);
  }
  return titles;
}

function parseEvents(bodyLines) {
  const secStart = findSection(bodyLines, 'Events');
  if (secStart === -1) throw new Error("Missing '## Events' section");
  const secEnd = nextSectionOrEnd(bodyLines, secStart);
  const rows = parseTable(bodyLines, secStart, secEnd);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => normCol(h).toLowerCase());
  const idIdx = headers.indexOf('id');
  const textIdx = headers.indexOf('text');
  if (idIdx === -1) throw new Error("Events table missing 'ID' column");
  if (textIdx === -1) throw new Error("Events table missing 'Text' column");

  const minlevelIdx = headers.indexOf('minlevel');
  const minhoursIdx = headers.indexOf('minhours');
  const weightIdx = headers.indexOf('weight');
  const onceIdx = headers.indexOf('once');
  const minRebirthIdx = headers.indexOf('minrebirth');
  const typeIdx = headers.indexOf('type');

  const events = [];
  const ids = new Set();
  for (const row of rows.slice(1)) {
    if (row.length <= idIdx || row.length <= textIdx) continue;
    const id = row[idIdx];
    if (ids.has(id)) throw new Error(`Duplicate event ID: ${id}`);
    ids.add(id);
    events.push({
      id,
      type: typeIdx !== -1 ? row[typeIdx].trim().toLowerCase() : 'story',
      minLevel: minlevelIdx !== -1 ? parseInt(row[minlevelIdx], 10) || 1 : 1,
      minHours: minhoursIdx !== -1 ? parseInt(row[minhoursIdx], 10) || 0 : 0,
      minRebirth: minRebirthIdx !== -1 ? parseInt(row[minRebirthIdx], 10) || 0 : 0,
      weight: weightIdx !== -1 ? parseInt(row[weightIdx], 10) || 5 : 5,
      once: onceIdx !== -1 ? parseBool(row[onceIdx]) : false,
      text: row[textIdx],
    });
  }
  return events;
}

function parseHolidayEvents(bodyLines) {
  const secStart = findSection(bodyLines, 'HolidayEvents');
  if (secStart === -1) return [];
  const secEnd = nextSectionOrEnd(bodyLines, secStart);
  const rows = parseTable(bodyLines, secStart, secEnd);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => normCol(h).toLowerCase());
  const holidayIdIdx = headers.indexOf('holidayid');
  const textIdx = headers.indexOf('text');
  if (holidayIdIdx === -1) throw new Error("HolidayEvents table missing 'HolidayID' column");
  if (textIdx === -1) throw new Error("HolidayEvents table missing 'Text' column");

  const minlevelIdx = headers.indexOf('minlevel');
  const minhoursIdx = headers.indexOf('minhours');
  const weightIdx = headers.indexOf('weight');
  const onceIdx = headers.indexOf('once');
  const typeIdx = headers.indexOf('type');

  const events = [];
  for (const row of rows.slice(1)) {
    if (row.length <= holidayIdIdx || row.length <= textIdx) continue;
    events.push({
      holidayId: row[holidayIdIdx].trim(),
      type: typeIdx !== -1 ? row[typeIdx].trim().toLowerCase() : 'day',
      minLevel: minlevelIdx !== -1 ? parseInt(row[minlevelIdx], 10) || 1 : 1,
      minHours: minhoursIdx !== -1 ? parseInt(row[minhoursIdx], 10) || 0 : 0,
      weight: weightIdx !== -1 ? parseInt(row[weightIdx], 10) || 5 : 5,
      once: onceIdx !== -1 ? parseBool(row[onceIdx]) : false,
      text: row[textIdx],
    });
  }
  return events;
}

function parseAchievements(bodyLines) {
  const secStart = findSection(bodyLines, 'Achievements');
  if (secStart === -1) return [];
  const secEnd = nextSectionOrEnd(bodyLines, secStart);
  const rows = parseTable(bodyLines, secStart, secEnd);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => normCol(h).toLowerCase());
  const idIdx = headers.indexOf('id');
  const nameIdx = headers.indexOf('name');
  const descIdx = headers.indexOf('desc');
  const condTypeIdx = headers.indexOf('conditiontype');
  const condValIdx = headers.indexOf('conditionvalue');
  if (idIdx === -1) throw new Error("Achievements table missing 'ID' column");
  if (nameIdx === -1) throw new Error("Achievements table missing 'Name' column");
  if (descIdx === -1) throw new Error("Achievements table missing 'Description' column");
  if (condTypeIdx === -1) throw new Error("Achievements table missing 'ConditionType' column");
  if (condValIdx === -1) throw new Error("Achievements table missing 'ConditionValue' column");

  const iconIdx = headers.indexOf('icon');
  const maxIdx = Math.max(idIdx, nameIdx, descIdx, condTypeIdx, condValIdx);

  const achievements = [];
  const ids = new Set();
  for (const row of rows.slice(1)) {
    if (row.length <= maxIdx) continue;
    const id = row[idIdx];
    if (ids.has(id)) throw new Error(`Duplicate achievement ID: ${id}`);
    ids.add(id);

    const condType = row[condTypeIdx].trim().toLowerCase();
    const condVal = parseInt(row[condValIdx], 10);
    if (isNaN(condVal)) throw new Error(`Achievement '${id}' condition value parse error`);

    let condition;
    switch (condType) {
      case 'level': condition = { type: 'level', value: condVal }; break;
      case 'runtime': condition = { type: 'runtime', value: condVal }; break;
      case 'events': case 'eventscollected': condition = { type: 'events', value: condVal }; break;
      case 'titles': case 'titlecount': condition = { type: 'titles', value: condVal }; break;
      default: throw new Error(`Unknown achievement condition type '${condType}' in '${id}'`);
    }

    achievements.push({
      id,
      name: row[nameIdx],
      desc: row[descIdx],
      icon: iconIdx !== -1 ? row[iconIdx] : '★',
      condition,
    });
  }
  return achievements;
}

function validateScenario(scenario) {
  if (!/^[a-z0-9_]+$/.test(scenario.id)) {
    throw new Error(`Scenario ID '${scenario.id}' must contain only lowercase letters, digits, and underscores`);
  }
  for (const event of scenario.events) {
    if (event.text.length < 10) {
      throw new Error(`Event '${event.id}' text too short (${event.text.length} chars, min 10)`);
    }
    if (event.weight < 1 || event.weight > 10) {
      throw new Error(`Event '${event.id}' weight ${event.weight} out of range [1,10]`);
    }
  }
  for (const ach of scenario.achievements) {
    if (ach.condition.type === 'level' && ach.condition.value > 1000) {
      throw new Error(`Achievement '${ach.id}' level condition ${ach.condition.value} too high`);
    }
    if (ach.condition.type === 'runtime' && ach.condition.value > 31536000000) {
      throw new Error(`Achievement '${ach.id}' runtime condition ${ach.condition.value} too high`);
    }
  }
}

function parseScenarioMd(content) {
  const lines = content.split(/\r?\n/);
  const { yaml: yamlText, bodyStart } = extractFrontmatter(lines);
  const meta = parseYaml(yamlText);
  if (!meta.id || !meta.name || !meta.name_cn || !meta.description || !meta.player_title) {
    throw new Error('Frontmatter missing required fields (id, name, name_cn, description, player_title)');
  }

  const bodyLines = lines.slice(bodyStart);
  const titles = parseTitles(bodyLines);
  const events = parseEvents(bodyLines);
  const holidayEvents = parseHolidayEvents(bodyLines);
  const achievements = parseAchievements(bodyLines);

  if (titles.length === 0) throw new Error('Titles section is empty');
  if (events.length === 0) throw new Error('Events section is empty');

  const scenario = {
    id: meta.id,
    name: meta.name,
    name_cn: meta.name_cn,
    description: meta.description,
    player_title: meta.player_title,
    mechanic: meta.mechanic || 'standard',
    max_rebirth: meta.max_rebirth || 0,
    unlock_requirement: meta.unlock_requirement || {},
    completion_title: meta.completion_title || '',
    titles,
    events,
    holidayEvents,
    achievements,
  };

  validateScenario(scenario);
  return scenario;
}

function main() {
  if (!fs.existsSync(SCENARIOS_DIR)) {
    fs.mkdirSync(SCENARIOS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SCENARIOS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  const scenarios = [];
  for (const file of files) {
    const filePath = path.join(SCENARIOS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const scenario = parseScenarioMd(content);
    scenarios.push(scenario);
  }

  if (scenarios.length === 0) {
    console.error('No .md scenario files found in scenarios/ directory');
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(scenarios, null, 2), 'utf-8');
  console.log(`Parsed ${scenarios.length} scenario(s), wrote ${OUTPUT_PATH}`);
}

main();
