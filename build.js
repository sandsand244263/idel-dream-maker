import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { parseScenarioMd } = require('./src/scenario-parser.cjs');

const SCENARIOS_DIR = path.join(__dirname, 'scenarios');
const OUTPUT_PATH = path.join(__dirname, 'public', 'scenarios_data.json');

function loadDir(scenarios, dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      const scenario = parseScenarioMd(content);
      // Prevent duplicate IDs: built-in scenarios take priority
      if (!scenarios.find(s => s.id === scenario.id)) {
        scenarios.push(scenario);
        console.log(`  Loaded: ${scenario.name_cn} (${scenario.id})`);
      } else {
        console.warn(`  Skipped duplicate ID '${scenario.id}' from user scenario: ${file}`);
      }
    } catch (e) {
      console.error(`  Error parsing user scenario ${file}: ${e.message}`);
    }
  }
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

  // Also load user scenarios from scenarios_user/
  const userDir = path.join(__dirname, 'scenarios_user');
  loadDir(scenarios, userDir);

  if (scenarios.length === 0) {
    console.error('No .md scenario files found in scenarios/ directory');
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(scenarios, null, 2), 'utf-8');
  console.log(`Parsed ${scenarios.length} scenario(s), wrote ${OUTPUT_PATH}`);
}

main();
