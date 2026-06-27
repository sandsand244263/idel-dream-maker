const fs = require('fs');
const content = fs.readFileSync('scenarios/wasteland.md', 'utf-8');
const lines = content.split('\n');

const eventsStart = lines.findIndex(l => l.trim() === '## Events');
const holidaysStart = lines.findIndex(l => l.trim() === '## HolidayEvents');

let fixed = 0;
for (let i = eventsStart + 3; i < holidaysStart; i++) {
  const line = lines[i].trim();
  if (!line.startsWith('|') || line.startsWith('|---')) continue;

  let cells = line.slice(1, -1).split('|').map(c => c.trim());
  if (cells.length < 20) continue;

  // Truncate to 20
  if (cells.length > 20) {
    cells = cells.slice(0, 20);
  }

  // cells[19] should be Text (30-80 chars). cells[18] should be Action.
  // If cells[19] is short (<5 chars), it's likely the Action shifted into Text position
  // This means there's an extra empty cell before Choice1
  if (cells[19].length < 5 && cells[18].length < 5) {
    // Try removing cells[10] (extra empty between CompletionTitle and Choice1)
    const testCells = [...cells];
    testCells.splice(10, 1); // remove the extra cell
    if (testCells.length === 19) {
      testCells.push(''); // pad back to 20
      // Check if action is now at [18]
      if (testCells[18].length >= 1 && testCells[19].length >= 10) {
        cells = testCells;
        fixed++;
      }
    }
  }
  
  // Also fix common issue: trailing empty before Choice value
  // If cells[10] is empty and cells[11] has a Chinese-choice and cells[18] is "抉择"
  // but cells[19] is also a Chinese action word (shifted), remove cells[10]
  if (cells[10] === '' && cells[18].length >= 1 && cells[18].length < 5 && cells[19].length < 5) {
    const testCells = [...cells];
    testCells.splice(10, 1);
    if (testCells.length === 19) {
      testCells.push('');
      if (testCells[18].length >= 1 && testCells[19].length >= 10) {
        cells = testCells;
        fixed++;
      }
    }
  }

  lines[i] = '| ' + cells.join(' | ') + ' |';
}

fs.writeFileSync('scenarios/wasteland.md', lines.join('\n'), 'utf-8');
console.log(`Fixed ${fixed} rows`);
