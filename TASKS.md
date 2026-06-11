# Idel-DreamMaker 工作任务清单

> 跨版本工作追踪。新 AI 对话请先读此文件，找到当前未完成的任务。

---

## 新对话启动流程

```
1. 读 CLAUDE.md       → 了解项目定义、架构、规则
2. 读 架构文档.md       → 了解当前架构、版本记录、开发进度
3. 读 TASKS.md         → 找到当前版本未完成的 Task
4. git log --oneline -5 → 确认最新提交和进度
5. 执行对应 Task
```

---

## v0.3.3 — 托盘修复 + 副本进度保留 + 调试面板

> 当前进度：✅ 全部完成 — v0.3.3 已执行

### Task 1 ✅ — 托盘 tooltip 修复

| 项目 | 值 |
|------|-----|
| 原因 | `TrayIconBuilder::new()` 不设置 ID，导致 `app.tray_by_id("main")` 找不到托盘 |
| 修复 | 改为 `TrayIconBuilder::with_id("main")`（和 AquaTray 一致）；前端每 5s 通过 `invoke('update_tooltip')` 更新 tooltip |
| 涉及文件 | `lib.rs` `game.rs` `main.js` |

### Task 2 ✅ — 副本进度保留（累积式 B）

| 项目 | 值 |
|------|-----|
| 改动 | 新增 `ScenarioProgress` 结构体；`GameState` 新增 `scenario_progress: HashMap<String, ScenarioProgress>` |
| 行为 | 退出副本时保存等级/经验/触发事件/成就/称号索引到 HashMap；下次进入同一副本时恢复进度；进入不同副本时从该副本进度恢复（或无进度则从 1 级开始） |
| 涉及文件 | `game.rs` |

### Task 3 ✅ — 开发者工具

| 项目 | 值 |
|------|-----|
| 触发 | `Ctrl+Shift+D` 打开/关闭半透明调试面板 |
| 内容 | `is_in_hub` / `isMiniMode` / 等级 / 经验 / 称号索引 / 语言 / 窗口尺寸 / 完整 json 序列化 |
| 涉及文件 | `index.html` `main.js` `style.css` |

### Task 4 ✅ — Mini Bar [–] 修复

| 改动 | 改为 `hide_window()`（之前是 no-op 的 `set_window_mode("mini")`） |
|------|----------------------------------------------------------------|

### Task 5 ✅ — 等级显示修复

| 改动 | Hub 模式状态栏 `LV` 显示 `hubLevel` 而非 `gameState.level` |
|------|----------------------------------------------------------|

---

## 规范

- 每个 Task 执行前：`git add -A && git commit -m "快照: YYYY-MM-DD vX.Y.Z TaskN 前"`
- 每个 Task 执行后：更新 TASKS.md 中对应 Task 标记为 ✅
- 整个版本完成后：更新架构文档.md 版本记录 + 进度表
- 最终：`git add -A && git commit -m "vX.Y.Z: 版本说明"`
