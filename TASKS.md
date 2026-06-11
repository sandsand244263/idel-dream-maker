# Idel-DreamMaker 工作任务清单

> 跨版本工作追踪。新 AI 对话请先读此文件，找到当前未完成的任务。

---

## 新对话启动流程

```
1. 读 CLAUDE.md       → 了解项目定义、架构、规则
2. 读 架构文档.md       → 了解当前架构、版本记录
3. 读 TASKS.md         → 找到当前版本未完成的 Task
4. git log --oneline -5 → 确认最新提交和进度
5. 执行对应 Task
```

---

## v0.3.2 — 托盘气泡 + 日志保留 + 称号佩戴 + 等级同步

> 当前进度：✅ 全部完成 — v0.3.2 已执行

### Task 1 ✅ — 通知改托盘气泡 + 窗口可见性判断

| 项目 | 值 |
|------|-----|
| 难度 | 中 |
| 预计 | 1.5h |
| 范围 | Rust |

**问题：**
- 事件触发时即使游戏窗口在前端也会弹 Windows toast 通知
- 用户想要的是托盘图标气泡，不是通知中心 toast

**方案：**
- 将 `tauri-plugin-notification` 的 `NotificationExt` 调用替换为仅当窗口不可见时触发
- 通过 `app_handle.get_webview_window("main")` → `is_visible()` 判断
- 保留事件触发代码但用窗口可见性做门控

**涉及文件：**
- `src-tauri/src/game.rs`
- `src-tauri/Cargo.toml`（可选移除 notification 依赖）

**改动清单：**

```
Cargo.toml:
  - 删除 tauri-plugin-notification = "2"（不再需要）
  - 删除 dependencies 中 notification 相关

game.rs:
  - 删除 use tauri_plugin_notification::NotificationExt
  - 在 check_and_trigger_event() 中:
    - 原有的 notification().builder()...show() 移除
    - 替换为: 检查窗口可见性
      if let Some(window) = app_handle.get_webview_window("main") {
        if !window.is_visible().unwrap_or(false) {
          // 仅在窗口隐藏时弹托盘气泡
          if let Some(tray) = app_handle.tray_by_id("main") {
            let _ = tray.set_tooltip(Some(format!("[事件] {}", &text[..text.len().min(60)])));
          }
        }
      }
  - 同理修改 check_achievements() 中的通知

lib.rs:
  - 移除 plugin(tauri_plugin_notification::init())
  - 移除 use tauri_plugin_notification::NotificationExt

capabilities/default.json:
  - 移除 "notification:default"
```

### Task 2 ✅ — 日志区保留更多历史

| 项目 | 值 |
|------|-----|
| 难度 | 低 |
| 预计 | 10min |

**问题：** 日志区事件文本较旧的内容被新消息顶到不可见范围。

**方案：** 保留无限历史（已有），优化：
- 增大 `#log-area` 的最大高度利用
- 确保滚动到底部行为正确

**改动清单：**
```
style.css:
  - 已有 flex: 1，无需改动
  - 只需要确保无 max-height 限制（当前无限制，已正确）
```

### Task 3 ✅ — 托盘 tooltip 动态更新

| 项目 | 值 |
|------|-----|
| 难度 | 中 |
| 预计 | 30min |

**问题：** `tray_by_id("main")` 找不到默认 tray，tooltip 一直显示"Idel-DreamMaker"不变。

**方案：** `setup_tray()` 返回的 `TrayIcon` 存入 AppState，游戏循环直接调用。

**涉及文件：**
- `src-tauri/src/game.rs`
- `src-tauri/src/lib.rs`

**改动清单：**
```
lib.rs:
  - AppState 新增字段: pub tray: tauri::tray::TrayIcon
  - setup_tray() 返回 TrayIcon，存入 AppState
  - 删除 tray_by_id("main") 调用

game.rs:
  - start_game_loop 中: let state = app_handle.state::<AppState>();
    - 直接使用 state.tray.set_tooltip(Some(...))
  - 每 30s 更新 tooltip（已实现，只需改用 state.tray）
```

### Task 4 ✅ — 称号手动佩戴

| 项目 | 值 |
|------|-----|
| 难度 | 中 |
| 预计 | 1h |

**问题：** 称号只能自动选最高等级，不能手动指定。

**方案：** 新增命令 + 面板点击事件

**涉及文件：**
- `src-tauri/src/lib.rs`
- `src/main.js`
- `src/style.css`

**改动清单：**
```
lib.rs:
  - 新增命令 set_title(index: usize)
    - 参数 index 为 titles 数组索引
    - 存到 game.equipped_title_index
    - 注意边界检查
  - 注册新命令

main.js:
  - renderTitlesPanel() 中:
    - 每行称号可点击
    - 点击后调用 invoke('set_title', { index })
    - 成功后更新 currentTitle + updateUI()
    - 给当前佩戴的称号行加醒目标记（如绿色边框或加粗）
  - 默认初始: 从 save 中读取 equipped_title_index

style.css:
  - .title-item.equipped 样式（绿色左边框或高亮）
```

### Task 5 ✅ — 等级同步修复

| 项目 | 值 |
|------|-----|
| 难度 | 低 |
| 预计 | 10min |

**问题：** 进入副本/返回大厅后状态栏和 Mini Bar 可能显示旧等级（等待下一次 game-tick 才刷新）。

**方案：** 在模式切换代码末尾显式调用更新函数。

**涉及文件：**
- `src/main.js`

**改动清单：**
```
main.js:
  - hub card click handler（进入副本）末尾: 加 updateUI(); updateMiniBar();
  - draw scenario handler 末尾: 加 updateUI(); updateMiniBar();
  - btnBackHub handler（返回大厅）末尾: 加 updateUI(); updateMiniBar();
```
---

## 规范

- 每个 Task 执行前：`git add -A && git commit -m "快照: YYYY-MM-DD v0.3.2 TaskN 前"`
- 每个 Task 执行后：更新 TASKS.md 中对应 Task 标记为 ✅
- 整个版本完成后：更新架构文档.md 版本记录 + 进度表
- 最终：`git add -A && git commit -m "v0.3.2: 版本说明"`
