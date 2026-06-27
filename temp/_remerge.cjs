const fs = require('fs');
const path = require('path');

// Step 1: Read all segment files and extract events
const segmentFiles = [
  'temp/wasteland_shared_seg1.md',
  'temp/wasteland_survivor_seg1.md','temp/wasteland_survivor_seg2.md','temp/wasteland_survivor_seg3.md','temp/wasteland_survivor_seg4.md',
  'temp/wasteland_merchant_seg1.md','temp/wasteland_merchant_seg2.md','temp/wasteland_merchant_seg3.md','temp/wasteland_merchant_seg4.md',
  'temp/wasteland_fugitive_seg1.md','temp/wasteland_fugitive_seg2.md','temp/wasteland_fugitive_seg3.md','temp/wasteland_fugitive_seg4.md',
  'temp/wasteland_ai_seg1.md','temp/wasteland_ai_seg2.md','temp/wasteland_ai_seg3.md','temp/wasteland_ai_seg4.md',
];

const allEventRows = [];
for (const fpath of segmentFiles) {
  const content = fs.readFileSync(fpath, 'utf-8');
  const lines = content.split('\n');
  let inEvents = false;
  for (const line of lines) {
    const t = line.trim();
    if (t === '## Events') { inEvents = true; continue; }
    if (inEvents && (t.startsWith('## ') && t !== '## Events')) { inEvents = false; continue; }
    if (!inEvents) continue;
    if (t.startsWith('| ID |') || t.startsWith('|---')) continue;
    if (t === '' || !t.startsWith('|')) continue;
    
    // Normalize to 20 columns
    let cells = t.slice(1, -1).split('|').map(c => c.trim());
    
    // Fix extra cells
    while (cells.length > 20) {
      // Remove an extra empty cell - prefer removing one that creates double empty
      let removed = false;
      for (let i = 0; i < cells.length - 1; i++) {
        if (cells[i] === '' && cells[i+1] === '') {
          cells.splice(i, 1);
          removed = true;
          break;
        }
      }
      if (!removed) cells.pop(); // remove from end as fallback
    }
    // Fix too few cells
    while (cells.length < 20) {
      // Find position of expected non-empty cells and insert empty
      // Simple approach: find the Action column position and add empty cells before it
      // Since we know positions: Choice1[10], Choice1Target[11], Choice2[12], Choice2Target[13], Choice3[14]-Choice4Target[17]
      // Action[18], Text[19]
      // If we have fewer cells, it's likely missing empty Choice3/4 cells
      cells.push(''); // add empty at end
    }
    
    allEventRows.push(cells);
  }
}

// Step 2: Read existing frontmatter/titles/achievements/holidays
const existing = fs.readFileSync('scenarios/wasteland.md', 'utf-8');
const lines = existing.split('\n');

// Extract frontmatter, titles, achievements, holidays
const sections = {
  frontmatter: [],
  titles: [],
  achievements: [],
  holidays: []
};
let currentSection = 'frontmatter';
let inFrontmatter = false;

for (const line of lines) {
  if (line.trim() === '---') {
    if (!inFrontmatter) { inFrontmatter = true; sections.frontmatter.push(line); continue; }
    if (currentSection === 'frontmatter') { sections.frontmatter.push(line); currentSection = 'titles'; continue; }
  }
  if (line.trim() === '## Titles') { currentSection = 'titles'; sections.titles.push(line); continue; }
  if (line.trim() === '## Achievements') { currentSection = 'achievements'; sections.achievements.push(line); continue; }
  if (line.trim() === '## Events') { currentSection = 'events'; continue; }
  if (line.trim() === '## HolidayEvents') { currentSection = 'holidays'; sections.holidays.push(line); continue; }
  
  if (currentSection === 'frontmatter') sections.frontmatter.push(line);
  else if (currentSection === 'titles') sections.titles.push(line);
  else if (currentSection === 'achievements') sections.achievements.push(line);
  else if (currentSection === 'holidays') sections.holidays.push(line);
}

// Step 3: Rebuild the file
const output = [];
output.push(...sections.frontmatter);
output.push('');
output.push('## Titles');
output.push('');
output.push(...sections.titles.slice(1)); // skip ## Titles
output.push('');
output.push('## Achievements');
output.push('');
output.push(...sections.achievements.slice(1)); // skip ## Achievements
output.push('');
output.push('## Events');
output.push('');
output.push('| ID | Type | MinLevel | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |');
output.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const row of allEventRows) {
  output.push('| ' + row.join(' | ') + ' |');
}
output.push('');
output.push(...sections.holidays);

fs.writeFileSync('scenarios/wasteland.md', output.join('\n'), 'utf-8');
console.log(`Done! Wrote ${allEventRows.length} events.`);
