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

## v0.3.4 — 自定义标题栏 + 托盘修复 + UI 增强

> 当前进度：✅ 全部完成

### Task 1 ✅ — 自定义标题栏

`tauri.conf.json`: `decorations: false`, `shadow: true`  
`index.html`: `#titlebar`（28px 高，内含 `#titlebar-drag` + 最小化/最大化/关闭按钮）  
`main.js`: 拖拽 `invoke('start_dragging')`；按钮事件 `minimize()/maximize()/unmaximize()/hide_window()`  
`style.css`: titlebar 样式，hover 变色，关闭按钮红色背景

### Task 2 ✅ — 托盘左右键严格区分

`lib.rs`: `.show_menu_on_left_click(false)` + `match` 精确匹配 `Left+Up`

### Task 3 ✅ — 时长含秒

`formatRuntime()` 返回 `XhXmXs`；状态栏/关于面板/tooltip 同步

### Task 4 ✅ — 状态栏 ID + 布局调整

`titlebar-id`: `ID:Worker`；`titlebar-lv`: `LV:5`；`titlebar-title`: 称号

### Task 5 ✅ — 副本内隐藏"副本"按钮

`switchView(false)` → `btnScenario.classList.toggle('hidden', inHub)`

### Task 6 ✅ — 成就计数更新

`achievement-unlocked` 监听器中 `gameState.unlockedAchievements.push(id)` + `updateUI()`

### Task 7 ✅ — 日志防清空

`addLog()` 中 `logArea.children.length > 500` 时移除 `firstChild`；调试面板显示 `logCount`

### Task 8 ✅ — Mini Bar 加 ID

`miniId.textContent = 'ID:...'`

---

## 规范

- 执行前：`git add -A && git commit -m "快照: YYYY-MM-DD vX.Y.Z TaskN 前"`
- 执行后：更新 TASKS.md 对应 Task 标记 ✅
- 版本完成：更新架构文档.md 版本记录 + 进度表
- 最终：`git add -A && git commit -m "vX.Y.Z: 版本说明"`
