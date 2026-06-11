# Idel-DreamMaker 工作任务清单

> 跨版本工作追踪。新 AI 对话请先读此文件，找到当前未完成的任务。

---

## 新对话启动流程

```
1. 读 CLAUDE.md       → 项目定义、架构、规则
2. 读 架构文档.md       → 当前架构、版本记录、开发进度
3. 读 TASKS.md         → 当前版本未完成的 Task
4. git log --oneline -5 → 最新提交和进度
5. 执行对应 Task
```

---

## v0.3.5 — 全线修复 + 底部常驻状态条 + 文档对齐

> 当前进度：✅ 全部完成

### Task 1 ✅ — set_window_mode("full") 去掉 decorations

`lib.rs`: `set_window_mode("full")` 中删除 `window.set_decorations(true)` 和 `set_size`；仅保留 `always_on_top(false)`。避免点击迷你展开后 Windows 标题栏重现。

### Task 2 ✅ — Rust 命令替代前端动态 import

`lib.rs`: 新增 `window_minimize`、`window_toggle_maximize` 命令  
`main.js`: 标题栏按钮全部改用 `invoke()` 调用，去掉 `await import('@tauri-apps/api/window')`

### Task 3 ✅ — 底部常驻状态条

`index.html`: 新增 `#perma-status`（按钮栏上方）  
`style.css`: 10px 字号、dim 色、ellipsis  
`main.js`: `updatePermaStatus()` 显示 `ID:Worker | Lv.5 | 称号 | XhXmXs | 成就:N`

### Task 4 ✅ — Runtime 保护

`main.js`: `game-tick` 监听器中，若 payload 的 `total_runtime_ms === 0` 且 `lastRuntime > 0`，保留上次值。  
`btnBackHub` 回调: `lastRuntime = 0`。  
进入副本后初始值从 Rust 的 `total_runtime_ms` 恢复（`ScenarioProgress`）。

### Task 5 ✅ — 大厅空状态提示

`main.js`  `renderHubView()`: 若 `scenarioList` 为空数组，显示虚线边框的"暂无可用的副本"提示卡。

### Task 6 ✅ — 托盘 tooltip 修复

旧二进制未更新导致 tooltip 不工作。确保 `cargo build` 后新二进制覆盖运行。

### Task 7 ✅ — 文档全线重写

`CLAUDE.md` 重写: 双层架构/大厅等级/称号聚合/字体/语言/窗口/tooltip/debug/Ctrl+Shift+D/里程碑对齐  
`架构文档.md`: 版本记录 0.3.5 追加  
`TASKS.md`: 本次更新覆盖

---

## 规范

- 执行前：`git add -A && git commit -m "快照: YYYY-MM-DD vX.Y.Z TaskN 前"`
- 执行后：更新 TASKS.md 对应 Task 标记 ✅
- 版本完成：更新架构文档.md 版本记录 + 进度表
- 最终：`git add -A && git commit -m "vX.Y.Z: 版本说明"`
