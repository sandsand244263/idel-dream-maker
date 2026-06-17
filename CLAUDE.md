# Idel-DreamMaker — 项目主文档

**新 AI 会话请先读此文件。所有游戏规则、架构约定和开发约束在此定义。**

---

## 项目一句话定义

> Idel-DreamMaker = 藏在系统托盘里的宠物陪伴应用。挂机升级，解锁称号与成就，触发故事事件——陪你度过每一刻。大厅 + 副本双层架构：在大厅管理副本，进入副本后零交互挂机升级、随机弹出故事事件。

> **重要背景：** 创作者本人不具备编程技术背景，本项目完全通过 vibe coding 方式制作。
> AI 在生成代码/内容/文档时需考虑这一前提——输出应自解释、可维护、避免不必要的复杂度。
> 所有涉及"作者操作"的流程（如写 .md 文件、跑命令等）需给出清晰步骤和预期结果。

原名 IdleWorker，v0.3.0 起改名 Idel-DreamMaker。

---

## 工作规范（AI 必须遵守）

### 新对话启动流程

1. 先读本文件（`CLAUDE.md`）→ 了解项目定义、架构、规则、工作规范
2. 然后读 `TASKS.md` → 找到当前版本未完成的 Task
3. 执行 `git log --oneline -5` → 确认最新提交和进度
4. 如果 TASKS.md 中所有 Task 已完成（全部 ✅），则问用户"下一个版本做什么？"并参考 TASKS.md 的规划章节
5. 如果 TASKS.md 中有未完成的 Task，则直接开始执行第一个未完成的 Task

### Git 规范

- **每次改动前**：`git add -A && git commit -m "快照: YYYY-MM-DD 改动说明"`
- **每个 Task 完成后**：`git add -A && git commit -m "vX.Y.Z TaskN: 改动说明"`
- **版本完成后**：更新 TASKS.md + 本文件，然后 `git add -A && git commit -m "vX.Y.Z: 版本说明"`
- **禁止**：`amend`、`force push`、跳过 snapshot 直接改代码
- **推送**：每次 commit 后执行 `git push origin main`，确保远程与本地同步。Tag 在版本完成时一次性推送 `git push origin --tags`

### 文档更新规范

- 代码改动后必须同步更新：
  - `TASKS.md`：标记对应 Task ✅，更新进度
  - 本文件：追加版本记录、更新架构信息、更新开发进度表
- 不允许只改代码不更新文档

### 任务执行规范

- 一次只做一个 Task，完成后 ✅ 再进入下一个
- 每个 Task 完成后必须验证构建（Electron 启动测试 + `node build.js` + 前端 `npx vite build`）
- 构建失败则停止当前 Task，修复后才能继续
- 用户反馈 bug：先分析根因 → 列出方案 → 用户确认 → 再执行

### 多对话衔接

- 每个对话结束时确保所有修改已 `git commit`
- 新对话执行 `git log --oneline -5` 确认最新进度
- 新对话读 `TASKS.md` 找到未完成的 Task 开始

---

## 核心规则（AI 必须遵守）

1. **所有事件文本不在代码里硬编码**，由作者创作后放入副本文件（`.md` 格式，由 ScenarioWriter 按格式规则生成），构建时解析为 JSON 嵌入
2. **副本数据构建时保护**：.md 文件由 build.js 解析为 JSON，存入 `public/scenarios_data.json`，编译进 exe
3. **游戏是零交互的**——进入副本后没有按钮、点击、选择分支。纯挂机 + 偶尔阅读
4. **Steamworks 集成为可选项**，延后到 1.0，代码里条件编译
5. **跨平台**——Windows 系统托盘，macOS 菜单栏图标
6. **所有数据存为本地文件**（JSON 存档 + 本地副本文件），不做云端数据库
7. **存档位置**：`%APPDATA%/Idel-DreamMaker/`（Win）或 `~/Library/Application Support/Idel-DreamMaker/`（Mac）

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Electron（跨平台：Windows/macOS/Linux） | 34.x |
| 后端语言 | JavaScript（Node.js） | 22.x |
| 前端 | HTML + CSS + JS（无框架） | - |
| 构建工具 | Vite | 6.4.3 |
| 字体 | Maple Mono NF CN（打包内置） | - |
| 包管理器 | npm | 10.x |
| 打包工具 | electron-builder | 25.x |

---

## 文件结构

| 文件/目录 | 规模 | 职责 |
|-----------|------|------|
| `index.html` | 主 HTML 入口 | 大厅界面 + 副本界面 + 弹窗 + 侧面板 |
| `src/main.js` | 前端逻辑 | 状态同步、事件监听、按钮操作、面板渲染 |
| `src/style.css` | 前端样式 | 瘦长窗口 UI、Maple Mono 字体、动画 |
| `src/scenario.js` | 数据模型模块 | Scenario 结构体、等级/称号计算 |
| `electron/main.cjs` | Electron 主进程 | 窗口创建、IPC 注册、游戏循环、存档 |
| `electron/preload.cjs` | IPC 桥接 | contextBridge 暴露 invoke/on 给渲染进程 |
| `electron/tray.cjs` | 托盘逻辑 | 系统托盘图标、菜单、tooltip |
| `electron/windows.cjs` | 窗口管理 | 窗口创建、宠物窗口切换、位置控制 |
| `electron/pet.cjs` | 宠物窗口管理 | PetDex 精灵加载、Canvas 动画、游戏状态叠加 |
| `electron/pet-preload.cjs` | 宠物 IPC | 宠物窗口 IPC 桥接 |
| `electron/pet-context-menu.cjs` | 右键菜单窗口 | 独立 BrowserWindow，失焦自动隐藏 |
| `electron/pet-context-menu-preload.cjs` | 菜单 IPC 桥 | 右键菜单 IPC 桥接 |
| `electron/pet-selector.cjs` | 宠物选择窗口 | 独立 BrowserWindow，选择宠物/返回 |
| `electron/pet-selector-preload.cjs` | 选择器 IPC 桥 | 选择器 IPC 桥接 |
| `electron/pet-bubble.cjs` | 事件气泡窗口 | 独立 BrowserWindow，失焦自动隐藏 |
| `electron/pet-bubble-preload.cjs` | 气泡 IPC 桥 | 气泡 IPC 桥接 |
| `electron/holiday.cjs` | 节假日模块 | 节日日期检测、事件注入 |
| `pet/index.html`, `pet/pet.js`, `pet/style.css` | 宠物前端 | 宠物窗口渲染层 |
| `pet-context-menu/` | 右键菜单前端 | HTML/CSS/JS，独立 BrowserWindow |
| `pet-selector/` | 选择器前端 | HTML/CSS/JS，独立 BrowserWindow |
| `pet-bubble/` | 气泡前端 | HTML/CSS/JS，独立 BrowserWindow |
| `build.js` | 构建脚本 | 构建时解析 .md → scenarios_data.json |
| `scenarios/` | 副本源文件 | `.md` 格式副本源文件（作者工具） |
| `public/scenarios_data.json` | 副本数据 | 构建时生成，被游戏引擎加载 |
| `CLAUDE.md` | 项目主规范 | AI 新会话首读 |
| `TASKS.md` | 工作追踪 | 版本任务清单 + 路线规划 |
| — | 副本格式规范 | 见 ScenarioWriter `references/format-rules.md` |
| — | 节假日设计 | 见 `electron/holiday.cjs` 和 ScenarioWriter |
| `themes/designer.html` | 主题设计工具 | 可视化调整配色/效果，导出CSS，导入AI建议 |

---

## 体系架构

### 双层结构

```
┌─────────────────────────────────────────────┐
│              大厅 (Hub)                      │
│  ┌───────────────────────────────────────┐  │
│  │  全局玩家名（唯一）                    │  │
│  │  副本列表 ─ 选取 / 抽取 / 导入 / AI   │  │
│  │  大厅等级（跨副本累加，永不重置）      │  │
│  │  大厅称号（各副本称号聚合视图）        │  │
│  │  语言设置                             │  │
│  └───────────────────────────────────────┘  │
│                     │                        │
│        选择副本 → 进入（可选别名）           │
│                     ↓                        │
│  ┌───────────────────────────────────────┐  │
│  │              副本内 (Scenario)          │  │
│  │  副本内别名（独立于全局名）             │  │
│  │  EXP 1/s → 等级/称号/事件/成就         │  │
│  │  退出 → 等级重置，EXP 累入大厅         │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**大厅内规则：** 不涨 EXP、不触发事件、不检测成就。纯管理界面。

**副本内规则：** 零交互挂机，只读。

### 核心数据流

```
启动 → init() → 判断 is_in_hub
                  ↓
       Hub = true → 显示大厅界面
       Hub = false → 显示副本界面 + 游戏循环开始
                       ↓
              游戏循环 (electron/main.cjs, setInterval 500ms)
                       ↓
           exp += 1/s ─┬→ 等级检测 → IPC emit(level-up)
                        ├→ 每 1s → IPC emit(game-tick) → 前端 updateUI()
                        ├→ 每 60s → 概率触发事件 → IPC emit(event-triggered)
                        ├→ 每 tick → 成就检测 → IPC emit(achievement-unlocked)
                        └→ 每 30s → save_game()

      退出副本时：
         hub.total_exp += delta（本次新获得经验，避免重复累加）
         副本进度保存到 scenarioProgress（经验/时长/事件/成就）
         is_in_hub = true → 切换显示大厅界面
         下次进入同一副本时从保存点恢复
```

### 大厅与副本切换流程

```
大厅（Hub）
├── 选择副本 → 进入（可选别名）
│   └── 副本内：挂机积累 EXP/等级/称号/事件/成就
│       └── 退出 → 等级重置，该副本获得的 EXP 加入大厅总经验
│           └── 大厅等级重新计算
│
├── 抽取副本 → 随机给一个（免费，不限次数）
│   └── 同选择流程
│
└── 删除副本 → 从列表中移除 + 清理该副本存档数据
```

---

## 关键模块详解

### 大厅 (Hub)

| 功能 | 实现位置 | 说明 |
|------|---------|------|
| 副本列表 | `src/main.js:renderScenarioPanel()` | 卡片列表，显示各副本名称/描述/进度 |
| 副本选择 | `electron/main.cjs` IPC `select-scenario` | 进入副本，可选别名，重置副本内状态 |
| 副本抽取 | `electron/main.cjs` IPC `draw-scenario` | 随机选一个副本（免费不限次） |
| 大厅等级 | `electron/main.cjs` game state | `hub_total_exp` 跨副本累加，公式 `sqrt(exp/100)+1` |
| 大厅称号 | `src/main.js:renderHubTitles()` | 各副本解锁称号聚合视图，按副本分组展开/折叠 |
| 副本数据 | `build.js` → `public/scenarios_data.json` | 构建时 .md → JSON |

**大厅内游戏规则：**
- `is_in_hub = true` → 游戏循环跳过 EXP 增长、事件触发、成就检测
- 仅更新 UI（计时器继续走）
- 所有按钮可用：设置、副本选择、称号、隐藏

### 副本内 (Scenario)

| 模块 | 实现位置 | 说明 |
|------|---------|------|
| GameState | `electron/main.cjs` | 副本内状态：level/exp/称号/事件/成就 |
| 游戏循环 | `electron/main.cjs` `startGameLoop()` | 500ms tick，仅当 `!isInHub` 时执行 |
| 事件触发 | `electron/main.cjs` `checkAndTriggerEvent()` | 每 60s 概率触发 |
| 成就检测 | `electron/main.cjs` `checkAchievements()` | 每 tick 检测 |
| 存档读写 | `electron/main.cjs` `readSave()/writeSave()` | 单文件 JSON，路径 `%APPDATA%/Idel-DreamMaker/save.json` |

**退出副本逻辑：**
```js
function exitToHub() {
  const unlocked = getUnlockedTitles(currentScenario, gameState.level).map(t => t.name);
  const sid = gameState.scenarioId;
  if (sid) {
    if (!gameState.unlockedTitleSets) gameState.unlockedTitleSets = {};
    gameState.unlockedTitleSets[sid] = unlocked;
    // Only add delta exp to hub to avoid double counting
    const prevProgress = gameState.scenarioProgress && gameState.scenarioProgress[sid];
    const prevExp = prevProgress ? prevProgress.totalExpEarned : 0;
    const delta = gameState.totalExpEarned - prevExp;
    gameState.hubTotalExp += Math.max(0, delta);
    // Save progress so re-entering same scenario resumes
    gameState.scenarioProgress[sid] = {
      totalExpEarned: gameState.totalExpEarned,
      totalRuntimeMs: gameState.totalRuntimeMs,
      triggeredEvents: [...gameState.triggeredEvents],
      unlockedAchievements: [...gameState.unlockedAchievements],
      equippedTitleIndex: gameState.equippedTitleIndex,
    };
  }
  gameState.scenarioId = '';
  gameState.isInHub = true;
  hubLevel = calcLevel(gameState.hubTotalExp);
}
```

### 语言系统

| 配置项 | 存储位置 | 说明 |
|--------|---------|------|
| `language` | `GameState.language` (`electron/main.cjs`) | UI 语言，仅中文 |

前端通过 `const LANG = { ... }` 映射表实现文本切换（`src/main.js`）。

静态 HTML 文本通过 `data-i18n` 属性标记，由 `applyLanguage()` 统一替换；
动态生成文本通过 `t(key)` / `tf(key, ...)` 函数从 LANG 表取值；
子窗口（右键菜单/气泡/选择器）通过 IPC `language-changed` 事件接收语言切换；
托盘菜单通过 `updateMenu()` 动态重建并显示当前语言。

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `language` | UI 界面语言（按钮/标签/提示等） | `zh` |

当前支持：`zh`（简体中文）。

### 窗口行为

| 项目 | 值 |
|------|-----|
| 默认尺寸 | 320 × 840（瘦长，类似 QQ 面板风格） |
| 最小尺寸 | 280 × 400 |
| 标题栏 | 自定义（`decorations: false`，Mac 为 `titleBarStyle: hidden`），自绘 ID/LV/称号 + [×] 按钮 |
| 贴边自动隐藏 | 已移除（v0.3.2） |
| Pet 宠物窗口 | v2.0 — PetDex 像素宠物窗口（独立透明 BrowserWindow + Canvas 动画） |
| 右键菜单窗口 | v2.2 — 独立 BrowserWindow，失焦自动隐藏，位于宠物窗口右侧 |
| 事件气泡窗口 | v2.2 — 独立 BrowserWindow，位于宠物窗口下方，失焦自动隐藏 |
| 宠物选择窗口 | v2.2 — 独立 BrowserWindow，位于宠物窗口右侧，含"返回"按钮 |
| 底部状态条 | 常驻显示：`v0.3.x | 玩家名 | 副本名<换行>LV:5 | 称号 | 时长 | 成就:N` |

### 托盘行为

| 操作 | 行为 |
|------|------|
| 左键单击 | Windows：显示/隐藏窗口；Mac：展开菜单 |
| 右键单击 | Windows：弹出菜单（Show/Hide、Quit）；Mac：同上（点击展开菜单） |
| 悬停 tooltip | 每 5 秒更新：`Lv.X 称号 | XhXmXs` 或 `大厅 Lv.X | XhXmXs` |

### 开发者工具

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+D` | 开启/关闭调试面板（显示完整 gameState、日志计数、窗口尺寸等） |

---

## 数据规格

| 项目 | 数值 | 说明 |
|------|------|------|
| EXP 速率 | 1 EXP/s | 恒定不变，仅副本内生效 |
| 大厅等级公式 | `floor(sqrt(hub_total_exp / 100)) + 1` | 全局进度，永不重置 |
| 副本等级公式 | `floor(sqrt(副本内总经验 / 100)) + 1` | 退出时保存进度，增量经验累入大厅 |
| 称号 | 30 个/副本 | 分布在 1-500 级间，含 ? 个用于最高等级 |
| 事件文本 | story ~500 条/副本 + filler ~4000 条/副本 | linear storytelling: 升级触发 story，时间驱动 filler。filler 密度公式 `floor(级时长分钟/60)`|
| 成就 | 50 个/副本 | level/runtime/events/titles 四类均衡分布 |
| 节日事件 | ~50 条/副本 | ~25 个节日，每个 advance + day 各 1 条 |
| 日志保留 | 不限 | 内存中保留全部，界面滚动查看 |
| 存档 | 多存档 | 大厅存档（全局）+ 各副本存档 |

**大厅称号：** 各副本已解锁称号的聚合视图，按副本分组，UI 可展开/折叠。

---

## 大厅等级

```
每次退出副本时：
  delta = 本次总经验 - 上次保存的经验（避免重复累加）
  hub.total_exp += delta
  hub.level = calculate_level(hub.total_exp)
  副本进度保存，下次进入时恢复

其中：
  calculate_level(exp) = floor(sqrt(exp / 100)) + 1
```

- 副本内等级/经验/时长在退出时保留（保存到 scenarioProgress），下次进入同一副本时恢复
- 大厅自身挂机不涨经验
- 切换副本时同步累加
- 大厅等级**永不重置**

---

## 事件触发逻辑

### 触发频率
```
每 60 秒检查一次
触发概率：前 12 小时 40%/次，之后 30%/次，72 小时后 15%/次
平均间隔：前期 ~2.5 分钟，中期 ~3.3 分钟，后期 ~6.7 分钟
```

### 节假日事件
约 25 个节日（固定日期 + 农历动态计算 + 浮动星期），节假日检测优先级：
1. **当天**（type=day）：节日当天触发，each scenario 配 1 条当天事件
2. **临近**（type=advance）：节前 3 天可触发，each scenario 配 1 条临近事件
3. 优先于普通线性事件触发

### 线性叙事模式

当前所有副本使用线性叙事：每个等级绑定一个唯一事件（`once=true`, `weight=1`, 各事件 minLevel 递增），玩家升到对应等级时触发该段叙事，构成完整故事线。无随机性、无重复。

### story/filler 双轨

| 类型 | 数量 | 触发方式 | 内容风格 |
|:----|:----:|:---------|:---------|
| **story** | ~500/副本 | 升级时触发，与等级提示合并显示为 "Lv.X — 事件文本" | 剧情主线，推动人生叙事 |
| **filler** | ~4000/副本 | 每天首次登录 1 条 + 挂机每小时 1 条，上限 8 条/天 | 日常见闻，不推进剧情 |

filler 密度公式：`floor(升该级所需秒数 / 3600)`，即每 60 分钟配 1 条，保证 filler 数量 ≈ 玩家实际能看到的上限。

### 弹窗行为
```
右下角弹出，持续 6 秒自动消失
成就弹窗更突出，持续 8 秒
可点击弹窗提前关闭
每个事件同时触发系统通知（托盘气泡）
```

---

## 字体方案

| 项目 | 值 |
|------|-----|
| 默认字体 | **Maple Mono NF CN**（支持中文/日文/韩文/拉丁/生僻字等多语种） |
| Fallback 字体 | `'Courier New', monospace` |
| 多语言覆盖 | Maple Mono NF CN 自带 CN/JP/KR/Latin 字型，一套字体覆盖所有 UI |

无主题切换，统一使用 Maple Mono NF CN。字体文件存放于 `public/fonts/`，随应用打包。

---

## 配置与模板说明

| 文件 | 关键参数 |
|------|---------|
| `package.json` | scripts: dev/electron:dev/electron:build; main: `electron/main.cjs` |
| `vite.config.js` | port: 1420 |
| `build.js` | 构建时 .md → `public/scenarios_data.json` |
| `electron-builder` | (通过 `electron:build` script 调用) |
| — | 副本格式规范 | 见 ScenarioWriter `references/format-rules.md` |

**存档路径：**
- Windows: `%APPDATA%/Idel-DreamMaker/save.json`
- macOS: `~/Library/Application Support/Idel-DreamMaker/save.json`

---

## 版本与进度

| 里程碑 | 进度 | 说明 |
|--------|------|------|
| 1. 引擎核心 | **100%** | 托盘 + 存档 + 挂机循环 + 称号 + UI（Tauri 版）|
| 2. 事件引擎 | **100%** | 副本 JSON + 随机触发 + 弹窗 + 副本选择 |
| 3. 成就系统 | **100%** | 条件检测 + 本地弹窗 + 通知 |
| 4. UI 改造 | **100%** | 按钮操作 + 迷你窗口 + 托盘修复 |
| 5a. 大厅架构 | **100%** | Hub + 抽选 + 别名 + 等级/称号 |
| 5b. 瘦长窗口 | **100%** | 320×840 + 自定义标题栏 |
| 5c. 语言系统 | **100%** | 中文 UI（已移除英文支持）|
| 6. 副本引擎 | **100%** | .md 解析器 + build.js JSON 输出 + 内容校验 |
| 7. 废土 500 事件 | **100%** | 500/500 条 |
| 8. Electron 迁移 | **100%** | Tauri → Electron 完整迁移（v1.0）|
| 9. 宠物窗口 | **100%** | v2.0 — PetDex 社区精灵 + Canvas 动画 + 通知队列 + 气泡交互 + 帧数自动检测 |
| 10. 节假日系统 | **100%** | v2.1 — 假日事件嵌入 .md + 游戏循环集成 + 调试按钮 |
| 11. 体验打磨 | **100%** | v2.1 — 气泡点击/消除/居中、单击 wave、托盘显示宠物、拖拽防误触 |
| 12. UI 打磨 Phase 1 | **100%** | v2.2 — 9 项细节优化（对比度/进度条/Toast/引导/边框等）|
| 13. 独立窗口系统 | **100%** | v2.2 — 右键菜单/选择器/气泡改为独立 BrowserWindow |
| 14. Mac 适配 | **代码已写**（未测试） | macOS 无测试环境，代码已按最佳实践编写 |
| 15. Steam+P2P | **0%** | 待定 |
| 16. 数据规格对齐 | **100%** | v2.4.0 — 称号30/成就50/节日25+ 全对齐 |
| 17. story/filler 双轨事件 | **100%** | v2.5.0 — 升级触发story+时间驱动filler+成就面板+整点报时 |

**当前阶段：** v2.5.0（已完成） — story/filler 双轨事件 + 成就面板 + 整点报时

| 项目 | 值 |
|------|-----|
| 当前版本 | 2.5.0 |
| 版本策略 | 主版本.功能版本.修复版本 |
| 下一阶段 | 新副本 / Mac 适配 / Steam |

### 版本路线

| 版本 | 内容 | 状态 |
|------|------|------|
| v0.1 ~ v0.2 | 引擎核心 + 事件引擎 + 成就系统 + UI 改造 | ✅ |
| v0.3.0 ~ v0.3.6 | 大厅架构 + 语言系统 + 托盘/标题栏 + 副本进度保留 | ✅ |
| v0.3.7 | 副本引擎与废土填充（.md 解析器 + build.js + 500 事件） | ✅ |
| **v1.0** | **Electron 迁移（替代 Tauri，Rust → JS，保留前端）** | ✅ |
| **v2.0** | **PetDex 像素宠物窗口（替换 Mini Bar）** | ✅ |
| **v2.1** | **节假日系统 + 气泡交互优化 + UX 打磨** | ✅ |
| **v2.2** | **UI 打磨 Phase 1（9 项细节优化）** | ✅ |
| **v2.3** | **主题体系全面实装** | ✅ |
| **v2.3.1** | **动效优化 + 闪烁修复** | ✅ |
| **v2.3.2** | **Bug 修复** | ✅ |
| **v2.4.0** | **数据规格对齐 + 节假日系统重写 + 全面中文本地化 + 帧数自动检测** | ✅ |
| **v2.5.0** | **story/filler 双轨事件 + 成就面板 + 整点报时** | ✅ |
| v2.6+ | 新副本 / Mac 适配 / Linux 打包 / Steam | 待定 |

> 注：Tauri 版已废弃（WebView2/Edge v149 不兼容，官方 1.5 年未修）。v1.0 迁移到 Electron。

### 版本升级记录

> 每次架构变更或版本更新均在此记录，方便 AI 回溯上下文。

| 版本 | 日期 | 改动内容 |
|------|------|---------|
| 0.1.0-beta | 2026-06-11 | 初始版本：项目骨架搭建、引擎核心、事件引擎、成就系统、终端 UI、废土副本 |
| 0.2.0-beta | 2026-06-11 | UI 改造：去除命令行改为按钮；迷你窗口 400×200；托盘图标修复；关闭→最小化；事件通知；未获得称号 ???；状态面板；版本号统一管理 |
| 0.2.1 | 2026-06-11 | Hotfix：字号 11→12px；状态面板改为 modal 弹窗；托盘 tooltip 动态更新 |
| 0.3.0-beta | 2026-06-11 | 项目改名 Idel-DreamMaker；大厅 Hub 双层架构；大厅等级/称号聚合；瘦长窗口 320×840；贴边自动隐藏（已删除）；中英语言系统；Maple Mono NF CN 字体；`.md` 副本格式；TASKS.md 工作清单 |
| 0.3.1-beta | 2026-06-11 | 字体 12→14px 全组件调大；删除贴边隐藏；别名弹窗 UI 化（替代 window.prompt）；副本→副本；Mini Bar 模式（250×80 半透明 + EXP 进度条 + 置顶 + 可拖拽）；新增"迷你"按钮；托盘 tooltip 修复；`select_scenario` 死锁修复 |
| 0.3.2 | 2026-06-11 | 通知改为窗口隐藏时托盘 tooltip 提醒；称号面板点击手动佩戴；进入副本/返回大厅后等级/称号立即同步；`select_scenario` 返回中增加 `titles` 字段 |
| 0.3.3 | 2026-06-11 | 托盘修复：`TrayIconBuilder::with_id("main")` + 前端每 5s `update_tooltip` invoke；副本进度保留；开发者工具（Ctrl+Shift+D）；`[–]` 按钮改为 `hide_window`；状态栏 Hub 模式显示大厅等级 |
| 0.3.4 | 2026-06-11 | 自定义标题栏（`decorations:false` + `#titlebar` 拖拽/最小化/最大化/关闭）；时长显示含秒；状态栏最左加 `ID:Worker`；副本内隐藏"副本"按钮；左键托盘严格区分；成就计数实时更新；日志上限 500 条；Mini Bar 显示 `ID` |
| 0.3.5 | 2026-06-11 | 修复 `set_window_mode("full")` 移除 `decorations:true`；新增 `window_minimize`/`window_toggle_maximize` Rust 命令；底部常驻状态条；`game-tick` 监听器保护；空大厅提示；`[–]` 按钮改用 Rust invoke；调试面板修复；CLAUDE.md 重写 |
| 0.3.6 | 2026-06-11 | 标题栏仅留 `[×]`；底部状态条配色同按钮栏；移除"状态"按钮+`#about-panel`；状态条内容改为完整状态；tooltip 格式优化；`set_window_mode("full")` 加回 `set_size` 和 `center()`；Mini bar 收起按钮去掉；冗余代码删除 |
| 0.3.6 hotfix | 2026-06-11 | 修复 JS 引用已删除的 `btn-minimize`/`btn-maximize` 导致脚本崩溃；状态条 11px→12px+两行显示；tooltip 双行换行；移除未使用的 `btnAbout` 引用 |
| 0.3.7-dev | 2026-06-12 | 路线调整：取消 AI 生成/导入导出（闭源制作转向）；保留 .md 格式改为作者工具 + build.js 二进制嵌入保护；版本路线重排 |
| **0.3.7** | **2026-06-12** | **副本引擎与废土填充完成：** build.js .md 解析器 + JSON 序列化嵌入；9 个核心引擎测试；前端 catch 错误处理；废土副本扩充至 500 条事件；旧 wasteland.json 废弃 |
| **0.4.0-dev** | **2026-06-12** | 路线调整：像素宠物窗口取代 Mini Bar（v0.4.0）；原体验打磨版本延至 v0.4.5 |
| **1.0-dev** | **2026-06-12** | 架构迁移计划：Tauri → Electron（WebView2 加载器与 Edge v149 不兼容）|
| **1.0.0** | **2026-06-12** | **Electron 迁移完成：** Rust 引擎重写为 JS；electron/main.cjs 主进程；electron/tray.cjs/windows.cjs 模块化；build.js 替代 build.rs；删除全部 Tauri 文件 |
| **2.0.0-dev** | **2026-06-12** | 像素宠物窗口启动：PetDex 社区精灵集成；独立 BrowserWindow 替换 Mini Bar；Canvas 8×9 帧动画渲染 |
| **2.0.0** | **2026-06-12** | **像素宠物窗口完成：** Canvas 动画对齐 PetDex、通知队列、气泡侧边自适应、圆点脉冲、主题 CSS 变量、双击 toggle 主窗口、窗口位置记忆、debug 调试面板 |
| **2.1.0** | **2026-06-13** | **节假日系统 + 体验打磨：** 假日事件嵌入 .md（build.js 解析）；游戏循环集成节日检测；气泡交互优化（点击展开、标题居中、自适应高度）；托盘显示宠物；单击 wave 动画修复；拖拽防误触；空白消除 |
| **2.2.0** | **2026-06-13** | **UI 打磨 Phase 1：** 9 项细节优化——去 Debug 自动弹出、标题栏/状态栏去重、对比度修正、EXP 进度条、Toast 提示、按钮 :active 反馈、保存指示器、空状态+首次引导、主窗口边框/圆角 |
| **2.2.0** | **2026-06-13** | **独立窗口系统：** 右键菜单/事件气泡/宠物选择器改为独立 BrowserWindow，失焦自动隐藏；五个窗口同层级独立运行 |
| **2.2.0** | **2026-06-13** | **v2.2 优化：** 主窗口失焦隐藏、三个子窗口配色同步、精灵图 9 行全调用、窗口重建逻辑 |
| **2.3.0-dev** | **2026-06-14** | **主题设计器：** 新增 `themes/designer.html`，可视化调参 + CSS 导出 + AI 建议导入；回滚 2.3.0 草稿
| **2.3.0-dev** | **2026-06-14** | **配色体系升级：** 14色+自定义+手动g1/g2渐变；删除样式开关，毛玻璃常驻；字号4级+间距3级统一
| **2.3.0** | **2026-06-15** | **主题体系全面实装：** 14色实装+渐变+毛玻璃卡片+设置面板色块+配色替换+子窗口主题同步+三大体系统一+宠物索引持久化+等级同步+教程重排+选择器UI
| **2.3.0** | **2026-06-15** | **体验修复：** 副本卡片hover闪烁修复(拆分renderHubView)+宠物选择器底部溢出修复+sendToPet日志清理+game-tick修复(大厅时发送)
| **2.3.1** | **2026-06-15** | **动效优化 + 闪烁修复 + 样式统一：** Canvas rAF 重构、CSS will-change + prefers-reduced-motion、transitionend 替代 setTimeout、子窗口入场动效(后删除)、子窗口透明窗口闪烁修复(backgroundColor + showInactive + setOpacity方案)、右键菜单toggle、退出弹窗文案对齐实际行为、工作区文件夹改名 IdleWorker → Idel-DreamMaker、精灵图缩放描边修复(imageSmoothingEnabled + alpha阈值清理)、右键菜单与宠物选择器样式完全统一(边距/字号/分割线/高亮/容器padding)
| **2.3.2** | **2026-06-16** | **Bug 修复：** 成就 runtime 条件乘 360 万倍修复、auto-save IPC 白名单缺失修复、删除前端旧 game.js 死代码
| **2.4.0** | **2026-06-16** | **数据规格对齐 + 节假日系统重写：** 称号30/成就50/节日25+，农历动态计算，临近3天检测，ScenarioWriter全规格更新；删副本MD格式模板+节假日事件池+副本设定集；废土副本扩充(称号30/成就50/节日事件52条)；Mac适配代码编写（未测试）；全面中文本地化(LANG表重构+data-i18n+子窗口+tray)；宠物优化(无宠物提示/导入后刷新/单击随机/待机活跃)；精灵帧数自动检测
| **2.5.0** | **2026-06-16** | **story/filler 双轨事件 + 成就面板 + 整点报时：** 升级触发story+时间驱动filler+成就面板+大厅称号可佩戴+整点报时+去宠物按钮+浮动待机+存档版本号+macOS托盘模板图标+canvas无宠物提示+重置存档debug |

---

## 常用操作

| 场景 | 命令/操作 | 说明 |
|------|-----------|------|
| 启动开发 | `npm run dev` | Vite 开发服务器（默认 1420 端口）|
| 启动应用 | `npm run electron:dev` | Vite + Electron 热重载 |
| 构建副本数据 | `node build.js` | .md → scenarios_data.json |
| 生产打包 | `npm run electron:build` | Vite build + electron-builder |
| 开发模式 | `npm run electron:dev` | Vite + Electron 热重载 |
| 打包 | `npm run electron:build` | Vite build + electron-builder（Windows 约 150MB） |
| Linux 打包 | `electron-builder --linux` | 需在 Linux 环境执行，生成 `.deb` / `.AppImage` |

---

## 注意点

- **像素宠物版权声明：** PetDex 社区精灵为玩家自行下载的用户数据（`%APPDATA%/Idel-DreamMaker/pets/`）。应用不捆绑、不分发任何精灵文件。精灵版权归各自创作者或 IP 权利人。应用内显示免责声明。下载地址：https://petdex.dev/
- 游戏引擎在 Electron 主进程运行（`electron/main.cjs`），通过 IPC (`contextBridge` + `ipcRenderer`/`ipcMain`) 与渲染进程通信
- 副本 `.md` 文件为作者内部制作工具，构建时由 `build.js` 解析为 JSON
- 游戏是零交互的——进入副本后没有按钮/点击，纯挂机
- Electron 打包安装包约 150MB（含 Chromium）
- Linux 打包（Ubuntu/Debian/Fedora）需在 Linux 环境下执行 `electron-builder --linux`，生成 `.deb` / `.AppImage`
- Linux 托盘图标在部分桌面环境（如 GNOME）需要 `libappindicator` 支持
- Maple Mono NF CN 字体文件存放于 `public/fonts/`，打包时包含
- 开发模式：`npm run electron:dev`（Vite + Electron 热重载）
- 生产打包：`npm run electron:build`（Vite build + electron-builder）
