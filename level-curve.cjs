/**
 * level-curve.cjs — 升级曲线共享模块（唯一权威公式）
 *
 * 引用方：
 *  - electron/main.cjs（游戏主进程）
 *  - mcp-server.cjs（AI 测试工具）
 *  - test/auto-test.cjs（自动化测试）
 *
 * 曲线规则（ADR-008）：
 *  - Lv.1~100：平方根公式（exp = 100 * (level-1)^2）
 *  - Lv.100+：等差数列（首项 4000，每级 +10），Lv.500 时 7990/级
 *  - 分段边界：Lv.100 = 980100
 *
 * 改动曲线时只需修改本文件，三处引用方自动同步。
 */

function calcLevel(exp) {
  if (exp <= 0) return 1;
  if (exp <= 980100) return Math.floor(Math.sqrt(exp / 100)) + 1;
  // LV100+ 等差数列：首项 4000，每级递增 10
  const r = exp - 980100;
  return 100 + Math.floor((-3995 + Math.sqrt(15960025 + 20 * r)) / 10);
}

function calcExpForLevel(level) {
  if (level <= 1) return 0;
  if (level <= 100) return 100 * (level - 1) * (level - 1);
  // LV100+ 等差数列反推
  const n = level - 100;
  return 980100 + n * (2 * 4000 + (n - 1) * 10) / 2;
}

module.exports = { calcLevel, calcExpForLevel };
