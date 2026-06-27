const fs = require('fs');
let content = fs.readFileSync('scenarios/wasteland.md', 'utf-8');

// Find the Events section and fix embedded newlines in pipe rows
const eventsIdx = content.indexOf('## Events');
const holidaysIdx = content.indexOf('## HolidayEvents');

const before = content.substring(0, eventsIdx);
const after = content.substring(holidaysIdx);
let eventsSection = content.substring(eventsIdx, holidaysIdx);

// Fix embedded newlines in pipe table rows
// A pipe row starts with | and ends with |. If it has newlines in between,
// they need to be removed.
const lines = eventsSection.split('\n');
const fixedLines = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  // Skip section headers and blank lines
  if (line.startsWith('## ') || line === '') {
    fixedLines.push(lines[i]);
    continue;
  }
  // If this line doesn't start with |, it's a continuation
  if (!line.startsWith('|') && fixedLines.length > 0) {
    fixedLines[fixedLines.length - 1] += ' ' + line;
  } else {
    fixedLines.push(line);
  }
}

const result = before + fixedLines.join('\n') + '\n' + after;
fs.writeFileSync('scenarios/wasteland.md', result, 'utf-8');
console.log('Fixed embedded newlines in Events table');
