const fs = require('fs');
const content = fs.readFileSync('scenarios/wasteland.md', 'utf-8');
const lines = content.split('\n');

// Find Events section boundaries
const eventsStart = lines.findIndex(l => l.trim() === '## Events');
const holidaysStart = lines.findIndex(l => l.trim() === '## HolidayEvents');

// Get the header line and count expected columns
const headerLine = lines[eventsStart + 2]; // line after ## Events and blank
const expectedCols = headerLine.slice(1, -1).split('|').length;
console.log(`Expected columns: ${expectedCols}`);

let fixed = 0;
for (let i = eventsStart + 3; i < holidaysStart; i++) {
  const line = lines[i].trim();
  if (!line.startsWith('|') || line.startsWith('|---')) continue;
  
  const cells = line.slice(1, -1).split('|').map(c => c.trim());
  if (cells.length === expectedCols) continue;
  
  // Fix: remove extra empty cells
  // Find empty cells that should be merged
  if (cells.length > expectedCols) {
    // Check which cells are extra - look for consecutive empty cells and remove extras
    const extra = cells.length - expectedCols;
    let removed = 0;
    const fixedCells = [];
    for (let j = 0; j < cells.length; j++) {
      if (cells[j] === '' && removed < extra && (fixedCells.length === 0 || cells[j] === cells[j+1])) {
        // Skip this empty cell if we still need to remove extras
        // Only remove if it creates a double empty
        removed++;
        continue;
      }
      fixedCells.push(cells[j]);
    }
    // If we still haven't removed enough, remove from the right side
    while (fixedCells.length > expectedCols) {
      fixedCells.pop();
    }
    lines[i] = '| ' + fixedCells.join(' | ') + ' |';
    fixed++;
  }
}

fs.writeFileSync('scenarios/wasteland.md', lines.join('\n'), 'utf-8');
console.log(`Fixed ${fixed} rows with wrong column count`);
