/**
 * validate_md.cjs — 检查 .md 副本文件的 pipe table 格式
 * 自动修复：BOM、行末缺 |
 * 报错：表中空行
 *
 * 用法：node validate_md.cjs <path>
 * 示例：node validate_md.cjs scenarios/starfield.md
 */

const fs = require('fs');
const path = process.argv[2];

if (!path) {
  console.error('用法: node validate_md.cjs <path>');
  process.exit(1);
}

const content = fs.readFileSync(path, 'utf-8');
let fixed = content;
let hasIssue = false;
const lines = fixed.split('\n');

// 1. 检查 BOM
if (fixed.charCodeAt(0) === 0xFEFF) {
  fixed = fixed.slice(1);
  console.log('[BOM] 已去除 BOM 标记');
  hasIssue = true;
}

// 2. 检查每个 pipe table 段
const cleanedLines = fixed.split('\n');
let inTable = false;
let tableStart = -1;
let fixCount = 0;

for (let i = 0; i < cleanedLines.length; i++) {
  const raw = cleanedLines[i];
  const trimmed = raw.trim();

  // 跳过空行
  if (trimmed === '') {
    if (inTable) {
      console.error(`[ERROR] 第 ${i + 1} 行: pipe table 内部有空行，会导致 parseTable 提前终止`);
      hasIssue = true;
    }
    continue;
  }

  // 检测 section 标题（退出 table）
  if (trimmed.startsWith('## ')) {
    inTable = false;
    continue;
  }

  // 检测分隔行
  if (trimmed.startsWith('|---')) {
    inTable = true;
    tableStart = i;
    continue;
  }

  if (!inTable) continue;

  // 在 table 中
  if (!trimmed.startsWith('|')) {
    console.error(`[ERROR] 第 ${i + 1} 行: pipe table 行首缺少 |\n  内容: "${trimmed.substring(0, 60)}..."`);
    hasIssue = true;
    continue;
  }

  if (!raw.endsWith('|')) {
    cleanedLines[i] = raw + '|';
    fixCount++;
    hasIssue = true;
  }

  // 检查是否有 BOM 嵌入行中
  if (raw.charCodeAt(0) === 0xFEFF || raw.charCodeAt(1) === 0xFEFF) {
    cleanedLines[i] = raw.replace(/^\uFEFF/, '');
    console.log(`[BOM] 第 ${i + 1} 行: 去除行首 BOM`);
    hasIssue = true;
  }
}

if (fixCount > 0) {
  console.log(`[FIX] 已补充 ${fixCount} 行末尾的 |`);
}

// 写回
if (hasIssue) {
  const result = cleanedLines.join('\n');
  fs.writeFileSync(path, result, 'utf-8');
  console.log(`[SAVE] 已写回 ${path}`);
} else {
  console.log('[OK] 格式检查通过，无需修复');
}
