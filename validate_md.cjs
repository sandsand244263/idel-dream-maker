/**
 * validate_md.cjs — 检查 .md 副本文件的 pipe table 格式
 *
 * 检查项（五类）：
 *   1. 文件头 BOM
 *   2. pipe table 内部有空行
 *   3. 表内行首缺少 |
 *   4. 表末缺少 |（可 --fix 自动补）
 *   5. 行内 BOM（行首 / 第 2 个字符）
 *
 * 用法：
 *   node validate_md.cjs <md文件>          只检查，绝不写盘
 *   node validate_md.cjs <md文件> --fix    检查并写回可自动修复的问题（写回前先列出要改的行）
 *   node validate_md.cjs --help            显示帮助
 *
 * 退出码：
 *   0 = 无问题（--fix 模式下表示已全部修好）
 *   1 = 存在 ERROR（默认模式下包括「可自动修复」的问题）
 *   2 = 用法错误 / 文件不存在 / 读取失败
 *
 * 示例：node validate_md.cjs scenarios/starfield.md
 */

'use strict';

const fs = require('fs');

const USAGE = [
  '用法:',
  '  node validate_md.cjs <md文件>          只检查，不写盘',
  '  node validate_md.cjs <md文件> --fix    检查并写回可自动修复的问题',
  '  node validate_md.cjs --help            显示本帮助',
  '',
  '退出码:',
  '  0 = 无问题（--fix 模式下表示已全部修好）',
  '  1 = 存在 ERROR',
  '  2 = 用法错误 / 文件不存在 / 读取失败',
].join('\n');

/**
 * 按行切分，但保留每行原本的行尾（\r\n / \n / \r），
 * 这样写回时不会把整个文件的行尾统一改掉。
 */
function splitLines(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    let j = i;
    while (j < text.length && text[j] !== '\n' && text[j] !== '\r') j++;
    if (j >= text.length) {
      out.push({ body: text.slice(i), eol: '' });
      break;
    }
    let eol = text[j];
    if (eol === '\r' && text[j + 1] === '\n') eol = '\r\n';
    out.push({ body: text.slice(i, j), eol });
    i = j + eol.length;
  }
  return out;
}

/**
 * 是否表格分隔行。放宽识别：
 *   |---|---|   | :--- |   |:--|   |---|:---:|
 *   --- | ---   （首尾竖线可省略）
 */
function isTableSeparator(trimmed) {
  // 必须含竖线，否则 YAML frontmatter 的 --- 分隔线会被误判成表格
  if (!trimmed.includes('|')) return false;
  let body = trimmed;
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|')) body = body.slice(0, -1);
  if (body.trim() === '') return false;
  const cells = body.split('|');
  return cells.every((cell) => /^:?-+:?$/.test(cell.trim()));
}

// ---- 参数解析 ----
const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}

let doFix = false;
const positional = [];
for (const arg of argv) {
  if (arg === '--fix') doFix = true;
  else if (arg.startsWith('-')) {
    console.error(`[ERROR] 未知参数: ${arg}`);
    console.error(USAGE);
    process.exit(2);
  } else positional.push(arg);
}

if (positional.length !== 1) {
  if (positional.length === 0) console.error('[ERROR] 缺少 md 文件参数');
  else console.error('[ERROR] 只接受一个 md 文件参数');
  console.error(USAGE);
  process.exit(2);
}

const file = positional[0];
let content;
try {
  content = fs.readFileSync(file, 'utf-8');
} catch (err) {
  console.error(`[ERROR] 无法读取文件: ${file} (${err.code || err.message})`);
  process.exit(2);
}

const lines = splitLines(content);
const errors = []; // 不可自动修复
const fixes = []; // 可自动修复（{line, msg, apply}）

// 1. 文件头 BOM
if (lines.length > 0 && lines[0].body.charCodeAt(0) === 0xfeff) {
  fixes.push({
    line: 1,
    msg: '文件头存在 BOM，去除',
    apply() {
      lines[0].body = lines[0].body.replace(/^\uFEFF/, '');
    },
  });
}

// 2~5. 逐个 pipe table 段
let inTable = false;

for (let i = 0; i < lines.length; i++) {
  const body = lines[i].body;
  const trimmed = body.trim();

  // 空行
  if (trimmed === '') {
    if (inTable) {
      // 表尾空行是合法的（后面接标题或正文就会正常结束表格），
      // 只有「空行之后仍是表行」才说明这张表被空行截断、后半段会被 parseTable 丢掉。
      let k = i + 1;
      while (k < lines.length && lines[k].body.trim() === '') k++;
      const nextTrim = k < lines.length ? lines[k].body.trim() : '';
      if (nextTrim.startsWith('|')) {
        errors.push({
          line: i + 1,
          msg: 'pipe table 内部有空行，后面的表行会被 parseTable 丢弃',
        });
      } else {
        inTable = false;
      }
    }
    continue;
  }

  // section 标题：退出 table
  if (trimmed.startsWith('## ')) {
    inTable = false;
    continue;
  }

  // 分隔行：进入 table（含 | :--- | / |:--| 等对齐写法）
  if (isTableSeparator(trimmed)) {
    inTable = true;
    continue;
  }

  if (!inTable) continue;

  // 表内行首缺少 |
  if (!trimmed.startsWith('|')) {
    errors.push({
      line: i + 1,
      msg: `pipe table 行首缺少 |，内容: "${trimmed.substring(0, 60)}"`,
    });
    continue;
  }

  // 表末缺少 |（插到行尾空白之前，保留原行尾）
  if (!trimmed.endsWith('|')) {
    fixes.push({
      line: i + 1,
      msg: '表末缺少 |，补一个',
      apply() {
        const cur = lines[i].body;
        const tail = (cur.match(/\s*$/) || [''])[0];
        lines[i].body = cur.slice(0, cur.length - tail.length) + '|' + tail;
      },
    });
  }

  // 行内 BOM
  if (body.charCodeAt(0) === 0xfeff) {
    fixes.push({
      line: i + 1,
      msg: '行首存在 BOM，去除',
      apply() {
        lines[i].body = lines[i].body.replace(/^\uFEFF/, '');
      },
    });
  } else if (body.charCodeAt(1) === 0xfeff) {
    fixes.push({
      line: i + 1,
      msg: '行内第 2 个字符是 BOM，去除',
      apply() {
        lines[i].body = lines[i].body.slice(0, 1) + lines[i].body.slice(2);
      },
    });
  }
}

function reportErrors() {
  for (const e of errors) console.error(`[ERROR] 第 ${e.line} 行: ${e.msg}`);
}

// ---- 只检查模式：不写盘 ----
if (!doFix) {
  reportErrors();
  for (const f of fixes) {
    console.error(`[ERROR] 第 ${f.line} 行: ${f.msg}（可用 --fix 自动修复）`);
  }
  const total = errors.length + fixes.length;
  if (total > 0) {
    console.error(
      `[FAIL] ${file}: ${errors.length} 个不可自动修复 + ${fixes.length} 个可自动修复，共 ${total} 个问题`
    );
    process.exit(1);
  }
  console.log(`[OK] ${file}: 检查通过，无问题`);
  process.exit(0);
}

// ---- --fix 模式：先列计划，再写回 ----
reportErrors();

if (fixes.length === 0) {
  if (errors.length > 0) {
    console.error(`[FAIL] ${file}: 仍有 ${errors.length} 个无法自动修复的问题，未写盘`);
    process.exit(1);
  }
  console.log(`[OK] ${file}: 检查通过，无需修复，未写盘`);
  process.exit(0);
}

console.log(`[PLAN] ${file}: 将要修改 ${fixes.length} 行`);
for (const f of fixes) console.log(`  第 ${f.line} 行: ${f.msg}`);

for (const f of fixes) f.apply();
fs.writeFileSync(file, lines.map((l) => l.body + l.eol).join(''), 'utf-8');
console.log(`[FIX] 已修复 ${fixes.length} 处并写回 ${file}`);

if (errors.length > 0) {
  console.error(`[FAIL] ${file}: 仍有 ${errors.length} 个无法自动修复的问题`);
  process.exit(1);
}
console.log(`[OK] ${file}: 修复完成`);
process.exit(0);
