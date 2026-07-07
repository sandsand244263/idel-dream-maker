const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

export function calculateLevel(totalExpEarned) {
  if (totalExpEarned <= 0) return 1;
  if (totalExpEarned <= 980100) return Math.floor(Math.sqrt(totalExpEarned / 100)) + 1;
  const r = totalExpEarned - 980100;
  return 100 + Math.floor((-3995 + Math.sqrt(15960025 + 20 * r)) / 10);
}

export function calcExpForLevel(level) {
  if (level <= 1) return 0;
  if (level <= 100) return 100 * (level - 1) * (level - 1);
  const n = level - 100;
  return 980100 + n * (2 * 4000 + (n - 1) * 10) / 2;
}

export function getCurrentTitle(scenario, level) {
  if (!scenario || !scenario.titles || scenario.titles.length === 0) return null;
  let best = scenario.titles[0];
  for (const t of scenario.titles) {
    if (t.level <= level) best = t;
    else break;
  }
  return best;
}

export function getUnlockedTitles(scenario, level) {
  if (!scenario || !scenario.titles) return [];
  return scenario.titles.filter(t => t.level <= level);
}

export function findScenarioById(scenarios, id) {
  return scenarios.find(s => s.id === id) || null;
}

export async function loadAllScenarios() {
  if (isNode) {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const jsonPath = path.resolve(__dirname, '..', 'public', 'scenarios_data.json');
    const data = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(data);
  } else {
    const resp = await fetch('/scenarios_data.json');
    if (!resp.ok) throw new Error(`Failed to load scenarios: ${resp.status}`);
    return resp.json();
  }
}
