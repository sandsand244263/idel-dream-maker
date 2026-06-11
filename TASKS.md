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

## v0.3.6 — 标题栏精简 + 底部状态条完善 + 迷你展开修复

> 当前进度：✅ 全部完成（含 hotfix：状态条两行+12px+tooltip双行）

### Task 1 ✅ — 标题栏只留 [×]

`index.html`: 去掉 `[─]` `[□]` 按钮；`main.js`: 移除对应事件绑定（`window_minimize`/`window_toggle_maximize` 命令保留，后续可能复用）

### Task 2 ✅ — 底部状态条完善

`style.css`: 配色改为按钮栏同色背景 + dim 色文字  
`main.js`: `updatePermaStatus()` 显示 `v0.3.6 | Player | Scenario | Lv.X | Title | XhXmXs | 成就:N`  
`index.html`: 移除 `#about-panel`（被永久状态条取代）；移除"状态"按钮

### Task 3 ✅ — 迷你展开尺寸+居中修复

`lib.rs`: `set_window_mode("full")` 加回 `set_size(320, 840)` + `window.center()`

### Task 4 ✅ — 托盘 tooltip 格式更新

`main.js`: `updateTooltip()` 输出 `玩家 | 副本 | Lv.X | 称号 | XhXmXs`

---

## 规范

- 执行前：`git add -A && git commit -m "快照: YYYY-MM-DD vX.Y.Z TaskN 前"`
- 执行后：更新 TASKS.md 对应 Task 标记 ✅
- 版本完成：更新架构文档.md 版本记录 + 进度表
- 最终：`git add -A && git commit -m "vX.Y.Z: 版本说明"`
