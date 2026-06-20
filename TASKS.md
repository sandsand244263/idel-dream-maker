# Idel-DreamMaker 工作任务清单

> 跨版本工作追踪。新 AI 对话请先读此文件，找到当前未完成的任务。

---

> **重要背景：** 创作者本人不具备编程技术背景，本项目完全通过 vibe coding 方式制作。
> AI 在生成代码/内容/文档时需考虑这一前提——输出应自解释、可维护、避免不必要的复杂度。
> 所有涉及"作者操作"的流程（如写 .md 文件、跑命令等）需给出清晰步骤和预期结果。

---

新对话启动流程详见 `CLAUDE.md` → **「工作规范」** 章节。

---

## v1.0 — 迁移到 Electron

> **当前阶段：v1.0（已完成）**
> 
> Tauri → Electron 迁移全部完成。8 个 Task 均已通过验证。
> 
> 原因：Tauri 的 WebView2 加载器与当前 Edge v149 运行时不兼容。迁移到 Electron 后不再依赖 WebView2。
>
> 策略：小单位增量迁移，每个 Task 独立可验证。

| # | 内容 | 涉及文件 | 状态 |
|--:|------|---------|:----:|
| 1 | **初始化 Electron 主进程** | `electron/main.cjs`, `electron/preload.cjs` (新建), `package.json` (改) | ✅ |
| 2 | **build.rs → build.js** | `build.js` (新建), 安装 yaml 包 | ✅ |
| 3 | **scenario.rs → scenario.js** | `src/scenario.js` (新建) | ✅ |
| 4 | **game.rs → 主进程游戏循环** | 游戏逻辑合并进 `electron/main.cjs`（未单独建 game.js） | ✅ |
| 5 | **main.js 通信改造** | `src/main.js` (改), `electron/preload.cjs` (补完) | ✅ |
| 6 | **系统托盘 + 窗口行为** | `electron/tray.cjs`, `electron/windows.cjs` (新建) | ✅ |
| 7 | **清理 Tauri 残余** | 删除 `src-tauri/`, `Cargo.*`, `.cargo/`, `target/` | ✅ |
| 8 | **文档对齐 + 打包测试** | `TASKS.md`, `架构文档.md` (更新) | ✅ |

### 执行顺序说明

每个 Task 完成后 AI 应当自行验证（启动 Electron 或跑脚本），不需要问"好了吗"。遇到报错自行修复再提交。

---

### Task 1 — 初始化 Electron 主进程

**目标：** 替换 Tauri 窗口系统。新建 Electron 主进程，能打开显示当前 HTML 界面。

**前置条件：** 当前工作目录为项目根目录 `E:\工作内容\11_vibe-coding项目\Idel-DreamMaker`

**执行步骤：**

```powershell
# 1. 卸载 Tauri 依赖
npm uninstall @tauri-apps/api @tauri-apps/plugin-shell @tauri-apps/cli

# 2. 安装 Electron
npm install electron electron-builder --save-dev

# 3. 创建 electron/ 目录
mkdir electron
```

**新建文件 `electron/main.js`：**

需要实现的功能：
1. 创建 `BrowserWindow`，尺寸 320×840，`frame: false`
2. 开发模式加载 `http://localhost:1420`，生产模式加载 `dist/index.html`
3. `webPreferences.preload` 指向 `electron/preload.js`
4. 启动时窗口隐藏（一开始不显示），通过托盘图标控制显示/隐藏
5. `app.on('ready')` 时创建窗口 + 托盘
6. 托盘：左键单击切换显示/隐藏，右键菜单（Show/Hide, Quit）

**新建文件 `electron/preload.js`：**

初期框架：
```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners(channel)
  }
})
```

**修改 `package.json`：**

```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:1420 && electron .\"",
    "electron:build": "vite build && electron-builder"
  }
}
```

```powershell
npm install concurrently wait-on --save-dev
```

**验证：**
```powershell
npm run electron:dev
```

期望结果：Electron 窗口打开，显示游戏 HTML 界面。托盘图标出现，左键可切换显示/隐藏。

**陷阱/注意：**
- `src/main.js`, `index.html`, `src/style.css` **不要改**——它们在前端和后端之间共享
- Electron 的 `frame: false` 等同于 Tauri 的 `decorations: false`
- 如果 `dist/` 目录有旧 Tauri 构建产物，先删除 `Remove-Item -Recurse -Force dist`
- 托盘图标用现有的 `src-tauri/icons/32x32.png`（路径在 electron 中通过 `path.join(__dirname, ...)` 引用）
- 使用 `electron-is-dev` 或 `app.isPackaged` 判断开发/生产模式

**模块化建议：** 将托盘逻辑抽出为 `electron/tray.js`，窗口管理抽出为 `electron/windows.js`，保持 `main.js` 精简。

---

### Task 2 — build.rs → build.js

**目标：** 把构建时解析 .md 的逻辑从 Rust 搬到 Node.js。删除 Rust 依赖（bincode、serde_yaml），输出 JSON 替代二进制。

**执行步骤：**

```powershell
npm install yaml --save-dev
```

**新建文件 `build.js`：**

需要实现的功能：
1. 读取 `scenarios/` 目录下所有 `.md` 文件
2. 解析 YAML frontmatter（用 `yaml` 包）
3. 解析 Markdown 表格（Titles、Events、Achievements）——直接复制 `build.rs` 的解析逻辑
4. 内容校验（ID 唯一、Level 升序、weight 范围等）
5. 输出 `public/scenarios_data.json`

**修改 `package.json`：**

```json
"build": "vite build && node build.js",
"electron:dev": "node build.js && concurrently \"npm run dev\" \"wait-on http://localhost:1420 && electron .\""
```

**删除文件：**
- `src-tauri/Cargo.toml` 中 `[build-dependencies]` 的 bincode、serde_yaml、serde_json（但暂时先保留，等 Task 7 再删整个 src-tauri）
- `build.rs` 暂时保留，但不再使用

**验证：**
```powershell
node build.js
```

期望结果：在控制台输出 "Parsed N scenarios"，`public/scenarios_data.json` 生成，JSON 内容包含所有副本的称号/事件/成就数据。

**陷阱/注意：**
- 不要直接 Copy `build.rs` 的逻辑——Rust 的 `serde_yaml` 和 JS 的 `yaml` 包接口不同
- 表格解析用 `string.split('|').map(s => s.trim())` 即可，不用引入复杂解析库
- 输出路径 `public/` 是 Vite 的静态资源目录，前端可以通过 `fetch('/scenarios_data.json')` 加载
- 确保 `public/` 下的 JSON 文件在每次 `node build.js` 时重新生成（缓存问题）

---

### Task 3 — scenario.rs → scenario.js

**目标：** 将数据模型和计算逻辑从 Rust 搬到 JS。前端和后端共享同一份 JS 模块。

**新建文件 `src/scenario.js`：**

需要导出的内容：

```js
// 数据类（同 scenario.rs 的 struct）
class Scenario { id, name, nameCN, description, playerTitle, titles, events, achievements }
class TitleDef { level, name, color, desc }
class EventDef { id, minLevel, minHours, weight, once, text }
class AchievementDef { id, name, desc, icon, condition }
// condition 格式: { type: 'level'|'runtime'|'events'|'titles', value: number }

// 函数
function loadAllScenarios()       // fetch('/scenarios_data.json') → Scenario[]
function findScenarioById(scenarios, id)
function getCurrentTitle(scenario, level)
function getUnlockedTitles(scenario, level)
function calculateLevel(totalExpEarned)
```

**修改 `index.html`：**

添加 `<script type="module" src="src/scenario.js"></script>`

**删除文件：**
- `src-tauri/src/scenario.rs`（代码已迁移到 JS，不再需要）

**验证：**
```powershell
node -e "const s = require('./src/scenario.js'); console.log(s.calculateLevel(100))"
```

期望结果：输出 2（100 exp → Lv.2）。

**陷阱/注意：**
- 不要改 `calculateLevel` 的公式——前后端必须一致（`floor(sqrt(exp / 100)) + 1`）
- `loadAllScenarios` 在 Node 环境和浏览器环境行为不同，用 `isNode` 判断使用 `fs.readFileSync` 还是 `fetch`
- 浏览器环境中 JSON 通过 Vite 的 `?url` import 或 `public/` 目录加载

---

### Task 4 — game.rs → game.js

**目标：** 将游戏引擎从 Rust 搬到 JS。这是最核心的 Task。

**新建文件 `src/game.js`：**

需要实现的类/函数：

```js
class GameState {
  playerName = 'Worker'
  scenarioId = ''
  level = 1
  exp = 0
  totalExpEarned = 0
  totalRuntimeMs = 0
  equippedTitleIndex = 0
  triggeredEvents = []       // String[]
  unlockedAchievements = []  // String[]
  isInHub = true
  hubTotalExp = 0
  scenarioAlias = ''
  unlockedTitleSets = {}     // { [scenarioId]: String[] }
  language = 'zh'
  scenarioProgress = {}      // { [scenarioId]: { totalExpEarned, totalRuntimeMs, ... } }
}

// 函数
function startGameLoop(onTick, onEvent, onLevelUp, onAchievement)
// 每 500ms tick，每秒 EXP+1，每 60s 检查事件触发
// onTick: (state) => void
// onEvent: (event) => void
// onLevelUp: (level, title) => void
// onAchievement: (achievement) => void

function saveGame(state)       // fs.writeFileSync JSON
function loadGame()            // fs.readFileSync JSON → GameState
function resetGameForScenario(state, scenario, alias)
function exitToHub(state)
function checkAndTriggerEvent(state, scenario)
function checkAchievements(state, scenario)
```

**关键逻辑移植对照：**

| game.rs 的 Rust 代码 | game.js 的 JS 代码 |
|---------------------|-------------------|
| `std::thread::spawn` + `loop { sleep(500ms) }` | `setInterval(callback, 500)` |
| `game.exp += 1.0` | `this.exp += 1` |
| `Mutex<GameState>` | 直接对象引用（JS 单线程不需要锁） |
| `emit("game-tick", payload)` | `onTick(state)` 回调 |
| `rand::gen_range(0..total_weight)` | `Math.random() * totalWeight` |
| `std::fs::write(path, content)` | `fs.writeFileSync(path, JSON.stringify(data))` |

**验证：**
```powershell
node -e "
const g = require('./src/game.js');
const state = new g.GameState();
state.exp = 100;
console.log('Level:', g.calculateLevel(state.exp));
"
```

期望结果：输出 `Level: 2`

**陷阱/注意：**
- `ScenarioProgress` 的保存逻辑不要改——字段名必须和旧存档兼容（`total_exp_earned`, `total_runtime_ms` 等）
- JS 中浮点数运算和 Rust 一致，但 `Math.floor` 替代 Rust 的 `floor`
- 游戏循环在 Electron 主进程运行（`electron/main.js`），不在渲染进程
- 通过 IPC 把游戏状态发送给渲染进程更新 UI

---

### Task 5 — main.js 通信改造

**目标：** 前端 UI（`src/main.js`）不再调用 `invoke`，改为调用 `window.electron.invoke`。

**需要改的部分（搜索 `invoke(` 和 `listen(` 两个模式）：**

```
invoke('get_full_state')          → window.electron.invoke('get-full-state')
invoke('get_scenario_list')       → window.electron.invoke('get-scenario-list')
invoke('select_scenario', {...})  → window.electron.invoke('select-scenario', {...})
invoke('exit_to_hub_cmd')         → window.electron.invoke('exit-to-hub')
invoke('draw_scenario')           → window.electron.invoke('draw-scenario')
invoke('set_player_name', {...})  → window.electron.invoke('set-player-name', {...})
...（以下调用类似，全部替换模式）

listen('game-tick', ...)          → window.electron.on('game-tick', ...)
listen('event-triggered', ...)    → window.electron.on('event-triggered', ...)
listen('level-up', ...)           → window.electron.on('level-up', ...)
listen('achievement-unlocked',...) → window.electron.on('achievement-unlocked', ...)
```

**Tauri 特有功能处理：**
| Tauri 功能 | Electron 替代 |
|-----------|-------------|
| `start_dragging` | `-webkit-app-region: drag` CSS |
| `hide_window` | 主进程：`mainWindow.hide()` |
| `set_window_mode('mini'/'full')` | 调整窗口大小 + `setAlwaysOnTop` |
| `set_window_position(x, y)` | `mainWindow.setPosition(x, y)` |
| `update_tooltip` | `tray.setToolTip(text)` |

**不需要改的：**
- `src/index.html` → 完全不变
- `src/style.css` → 完全不变
- `src/main.js` 中的 UI 逻辑（`renderHubView`, `renderScenarioPanel`, `addLog` 等）→ 不变
- `src/main.js` 中的 LANG 语言表 → 不变

**验证：**
```powershell
npm run electron:dev
```

期望结果：前端能正常显示游戏状态（等级、EXP、称号等），按钮能正常工作。

---

### Task 6 — 系统托盘 + 窗口行为

**目标：** 补全托盘功能和窗口行为（拖拽、最小化、迷你模式）。

**新建文件 `electron/tray.js`：**

需要实现：
1. 创建 `Tray`，图标用 `src-tauri/icons/32x32.png`
2. 左键单击 → 显示/隐藏窗口
3. 右键菜单 → Show/Hide, Quit
4. 每 5 秒更新 tooltip（格式：`ID:Worker | 废土\nLv.5 | 拾荒者 | 1h23m45s`）

**新建文件 `electron/windows.js`：**

需要实现：
1. 创建窗口（320×840，frame: false）
2. `setWindowMode('mini')` → 窗口 250×80，置顶
3. `setWindowMode('full')` → 窗口 320×840，取消置顶，居中
4. `setWindowPosition(x, y)` → 设置窗口位置
5. 窗口启动时隐藏（通过托盘图标唤出）

**修改 `electron/main.js`：**

引入 `tray.js` 和 `windows.js`，注册所有 IPC handlers。

**验证：**
```powershell
npm run electron:dev
```

期望结果：托盘图标正常工作，右键有菜单，左键切换窗口显示。迷你模式切换正常。

---

### Task 7 — 清理 Tauri 残余

**目标：** 删除所有与 Tauri/Rust 相关的文件。

```powershell
Remove-Item -Recurse -Force src-tauri
Remove-Item -Force Cargo.toml Cargo.lock
Remove-Item -Recurse -Force .cargo -ErrorAction SilentlyContinue
Remove-Item -Force rust-toolchain.toml -ErrorAction SilentlyContinue
Remove-Item -Force start-dev.ps1
Remove-Item -Force edge_downgrade.bat -ErrorAction SilentlyContinue

# 确认已无 Rust 文件
Get-ChildItem -Recurse -Filter "*.rs" -ErrorAction SilentlyContinue
```

**验证：**
```powershell
cargo check    # 预期：命令不存在（cargo 不再管理此项目）
npm run electron:dev  # 预期：能正常启动
```

---

### Task 8 — 文档对齐 + 打包测试

**目标：** 更新 CLAUDE.md、架构文档.md，跑一次完整的 Electron 打包。

**需要改的文档：**

- `CLAUDE.md`：技术栈改 Electron；版本路线改为 v1.0；删除 Tauri 特有章节
- `架构文档.md`：技术栈改 Electron；文件结构改新目录；删除 Tauri 特有章节
- 本文件（TASKS.md）：所有 Task 标记 ✅，准备下一版本

**打包测试：**
```powershell
npm run electron:build
```

验证：`dist/` 目录生成安装包（`.exe` / `.msi`），安装后能正常运行。

---

## 验证标准

每个 Task 完成后：
```
git add -A && git commit -m "v1.0 TaskN: 说明"
git push origin main
```

版本完成时额外：
```
npx electron-builder   # 打包验证
```

---

## v2.0 — 像素宠物窗口

> **当前阶段：v2.0（已完成）**
>
> PetDex 社区精灵像素宠物窗口，常驻桌面。独立 BrowserWindow，透明/置顶/可拖拽。动画对齐 PetDex 8 状态系统，点击交互（单击挥手/双击跳跃/右键菜单），事件气泡。不与主窗口切换，两者共存。
>
> **版权策略：** 应用不捆绑任何宠物精灵；宠物文件存放于 `%APPDATA%/Idel-DreamMaker/pets/`（用户数据）；应用内显示免责声明。

---

## v2.1 — 节假日系统 + 体验打磨

> **当前阶段：v2.1（已完成）**
>
> 节假日系统（假日事件嵌入 .md + build.js 解析 + 游戏循环集成 + 调试按钮）；气泡交互优化（点击展开/消除、标题居中、自适应高度）；托盘显示宠物；单击 wave 动画修复；UX 优化（拖拽防误触、空白消除）。

---

## v2.2 — UI 打磨 Phase 1

> **当前阶段：v2.2（已完成）**
>
> 细节优化 9 项全部完成。涵盖：去 Debug 自动弹出、标题栏/状态栏去重、对比度修正、EXP 进度条、Toast 提示、按钮反馈、保存指示器、空状态+引导、主窗口边框/圆角。

| # | 内容 | 涉及文件 | 状态 |
|--:|------|---------|:----:|
| 1 | **去掉 Debug 面板自动弹出** | `src/main.js` | ✅ |
| 2 | **标题栏/状态栏去重** | `src/main.js` | ✅ |
| 3 | **修正默认主题对比度** | `src/style.css`, `pet/style.css` | ✅ |
| 4 | **EXP 进度条** | `index.html`, `src/style.css`, `src/main.js` | ✅ |
| 5 | **错误操作 Toast 提示** | `index.html`, `src/style.css`, `src/main.js` | ✅ |
| 6 | **按钮 `:active` 反馈** | `src/style.css` | ✅ |
| 7 | **保存指示器（闪烁绿点）** | `index.html`, `src/style.css`, `src/main.js`, `electron/main.cjs` | ✅ |
| 8 | **大厅空状态 + 首次引导** | `index.html`, `src/style.css`, `src/main.js`, `electron/main.cjs` | ✅ |
| 9 | **主窗口黑色边框/圆角** | `src/style.css` | ✅ |

---

## v2.2 — 独立窗口系统

> **当前阶段：v2.2（已完成）**
>
> 右键菜单/事件气泡/宠物选择器改为独立 BrowserWindow，五个窗口同层级独立运行。失焦自动隐藏（不销毁），窗口重建逻辑兜底。

| # | 内容 | 涉及文件 | 状态 |
|--:|------|---------|:----:|
| 1 | **创建右键菜单独立窗口** | `pet-context-menu/*`, `electron/pet-context-menu.cjs`, `electron/pet-context-menu-preload.cjs` | ✅ |
| 2 | **创建事件气泡独立窗口** | `pet-bubble/*`, `electron/pet-bubble.cjs`, `electron/pet-bubble-preload.cjs` | ✅ |
| 3 | **创建宠物选择器独立窗口** | `pet-selector/*`, `electron/pet-selector.cjs`, `electron/pet-selector-preload.cjs` | ✅ |
| 4 | **失焦隐藏 + 窗口重建** | 三个窗口 `blur` → `hide()`，`showXxx` 自动重建 | ✅ |
| 5 | **宠物窗口移除内嵌菜单** | `pet/index.html`, `pet/pet.js`, `pet/style.css` | ✅ |
| 6 | **选择器加"返回"按钮** | `pet-selector/*`, `electron/pet-selector-preload.cjs` | ✅ |
| 7 | **气泡定位到宠物下方** | `electron/pet-bubble.cjs` | ✅ |

### v2.2 优化（同上版本）

| # | 内容 | 涉及文件 | 状态 |
|--:|------|---------|:----:|
| 1 | **主窗口失焦隐藏** | `electron/windows.cjs` | ✅ |
| 2 | **三窗口配色同步主题** | `pet-context-menu/*`, `pet-bubble/*`, `pet-selector/*`, `electron/main.cjs` | ✅ |
| 3 | **精灵图 9 行全调用** | `pet/pet.js` | ✅ |

## v2.3 — 主题体系全面实装

> **当前阶段：v2.3（已完成）**
>
> 14 色主题 + 自定义配色 + 渐变背景 + 毛玻璃卡片 + 子窗口主题同步 + 字号/间距/圆角体系统一。

| # | 内容 | 涉及文件 | 状态 |
|--:|------|---------|:----:|
| 1 | **14 色主题系统**（替换旧 5 色） | `src/style.css` + 4 子窗口 CSS | ✅ |
| 2 | **渐变背景**（每色 g1/g2 手动设定） | `src/style.css` | ✅ |
| 3 | **毛玻璃卡片常驻**（所有主题通用） | `src/style.css` | ✅ |
| 4 | **字号体系统一**（14/12/11/10 四级） | 全部 5 个 CSS 文件 | ✅ |
| 5 | **间距体系统一**（4/8/12 三级） | 全部 5 个 CSS 文件 | ✅ |
| 6 | **圆角体系统一**（2/4/8/50% 四级） | 全部 5 个 CSS 文件 | ✅ |
| 7 | **`--border` 变量名统一** | `pet/style.css` `--border-color` → `--border` | ✅ |
| 8 | **设置面板重做**（色块选主题 + 自定义配色） | `index.html` + `src/main.js` | ✅ |
| 9 | **配色替换**（橙/黄绿/蓝/黑/白 换为 Tokyo Night / Catppuccin） | 全部 5 个 CSS 文件 | ✅ |
| 10 | **子窗口主题同步**（broadcastTheme 推送） | `electron/main.cjs` + 4 个 preload + 4 个 script | ✅ |
| 11 | **硬编码边框修复**（3 处） | `pet/style.css` + `pet-bubble/style.css` | ✅ |
| 12 | **宠物选择器 UI 润色** | `pet-selector/style.css` | ✅ |
| 13 | **教程界面重排**（5 段 + 左对齐列表 + 行高/间距） | `index.html` + `src/style.css` | ✅ |
| 14 | **宠物索引持久化** | `electron/main.cjs` + `electron/pet.cjs` | ✅ |
| 15 | **宠物窗口等级同步**（大厅时显示大厅等级） | `electron/main.cjs` | ✅ |
| 16 | **设计器工具** → 已删除 | `themes/` | ✅ |
| 17 | **副本卡片 hover 闪烁修复** | `src/main.js` + `src/style.css` | ✅ |
| 18 | **宠物选择器底部溢出修复** | `pet-selector/style.css` | ✅ |

---

## v2.3.1 — 动效优化 + 闪烁修复

> **当前阶段：v2.3.1（已完成）**
>
> Canvas rAF 重构、CSS will-change + prefers-reduced-motion、transitionend 替代 setTimeout、子窗口闪烁修复（setOpacity 方案）、右键菜单 toggle、文案对齐、精灵图描边修复、两窗口样式统一。

| # | 内容 | 涉及文件 | 状态 |
|--:|------|---------|:----:|
| 1 | **Canvas 帧循环 rAF**（setInterval → requestAnimationFrame） | `pet/pet.js` | ✅ |
| 2 | **EXP 进度条 rAF**（setInterval 50ms → rAF） | `pet/pet.js` | ✅ |
| 3 | **CSS will-change + prefers-reduced-motion** | 全部 6 个 CSS 文件 | ✅ |
| 4 | **子窗口入场动效**（后因闪烁移除） | `pet-bubble/*`, `pet-context-menu/*`, `pet-selector/*` | ✅ |
| 5 | **transitionend 替代 setTimeout**（弹窗消失动效） | `src/main.js`, `src/style.css` | ✅ |
| 6 | **子窗口闪烁修复**（backgroundColor + setOpacity 替代 hide/show） | `electron/pet-context-menu.cjs`, `electron/pet-bubble.cjs`, `electron/pet-selector.cjs` | ✅ |
| 7 | **右键菜单 toggle**（重复右键关闭） | `electron/pet-context-menu.cjs` | ✅ |
| 8 | **退出弹窗文案对齐实际行为** | `src/main.js`, `CLAUDE.md` | ✅ |
| 9 | **工作区文件夹改名** `IdleWorker` → `Idel-DreamMaker` | — | ✅ |
| 10 | **精灵图描边修复**（imageSmoothingEnabled + alpha 阈值清理） | `pet/pet.js` | ✅ |
| 11 | **右键菜单与选择器样式完全统一**（边距/字号/分割线/高亮/容器 padding） | `pet-context-menu/style.css`, `pet-selector/style.css`, `pet-selector/script.js` | ✅ |

---

## 规划（待定）

| 内容 | 说明 |
|------|------|
| 新副本（中世纪/赛博/修仙/克苏鲁） | 延后 |
| Mac 适配 | Electron 天然支持，待测试并修复 |
| Steam 上架 | Electron 版本打包后上架 |

## v2.5.0 — story/filler 双轨事件 + 成就面板 + 整点报时

> **当前阶段：v2.5.0（已完成）**
>
> story/filler 双轨事件（升级触发 story，时间驱动 filler）、成就面板、大厅称号可佩戴、整点报时、浮动待机、存档版本号、禁用代码签名、macOS 托盘图标、canvas 无宠物提示、去除别名输入。

---

## 已废弃计划

| 版本 | 原计划 | 原因 |
|------|--------|------|
| v0.4.0 | AI 生成 + 导入导出 + API Key 设置 | 不再开放玩家自制副本 |
| v0.3.8 | 节假日系统 | 优先级低于引擎迁移 |

## v2.5.1 — Bug修复+报时改版

> **当前阶段：v2.5.1（已完成）**

| # | 内容 | 状态 |
|:-:|:-----|:----:|
| 1 | 关闭按钮 [x] 无反应 — 补事件绑定 | ✅ |
| 2 | story事件合并错位 — 进副本/恢复时触发初始故事 | ✅ |
| 3 | pet气泡未合并故事文本 — nq.enqueue含eventText | ✅ |
| 4 | 整点报时从infoBar改nq气泡 | ✅ |
| 5 | 每小时改为每半小时报一次 | ✅ |
| 6 | 去掉主窗口打开时清除pet通知队列的限制 | ✅ |
| 7 | log-area level-up日志包含故事文本 | ✅ |
| 8 | 整点首次虚假触发修复 | ✅ |

## v2.6.0 — 日志持久化+历程菜单+事件历史面板

> **当前阶段：v2.6.0（已完成）**

| # | 内容 | 涉及文件 | 状态 |
|:-:|:-----|:---------|:----:|
| 1 | **历程子菜单** — 称号/成就/事件折叠到一个下拉菜单 | `index.html`, `src/main.js`, `src/style.css` | ✅ |
| 2 | **事件历史面板** — 按日期分组，今天展开，往期折叠，懒加载 | `index.html`, `src/main.js`, `src/style.css` | ✅ |
| 3 | **日志持久化** — 事件写入按日文件，启动加载今日事件 | `electron/main.cjs`, `electron/preload.cjs`, `src/main.js` | ✅ |
| 4 | **log-area** — 取消500条上限；事件写入文件；启动恢复今日事件 | `src/main.js` | ✅ |
| 5 | **滚动条统一** — 所有面板补 `::-webkit-scrollbar` 样式 | `src/style.css`, `pet-context-menu/style.css` | ✅ |
| 6 | **pet通知队列** — 排队机制+bubble-closed触发下一条 | `pet/pet.js`, `pet-bubble.cjs`, `pet-bubble/script.js`, `pet-preload.cjs` | ✅ |
| 7 | **样式规范文档** — `themes/style-guide.md` 完整样式规范 | `themes/style-guide.md` | ✅ |
| 8 | **CSS统一** — `--border`变量/`color-mix`替换固定rgba/动画规范/`:active`统一/关闭按钮统一/字体变量统一/透明度统一 | `src/style.css`, `pet-bubble/style.css`, `pet-context-menu/style.css`, `pet-selector/style.css` | ✅ |

## v2.7.0 — 游戏架构大升级

> **当前阶段：v2.7.0（已完成）**
>
> 等级曲线分段加速 + filler动态上限 + 8条里程碑事件 + 每日仪式 + 副本结局+重生 + 5种挂机变体机制 + 重生番外框架 + 20个大厅称号 + 10个大厅成就 + 副本解锁框架 + 结局收藏面板 + ScenarioWriter skill完整升级。
>
> 核心目标：架构一次性搭好，后续增长靠作者用 skill 产副本内容，不需要改代码。

| # | 内容 | 涉及文件 | 状态 |
|:-:|:-----|:---------|:----:|
| 1 | **chime报时优先级 0→0.5** — 空队列可显示 | `pet/pet.js` | ✅ |
| 2 | **等级曲线分段加速** — LV100+线性，LV500从864天→117天 | `electron/main.cjs`, `src/main.js`, `src/scenario.js`, `pet/pet.js` | ✅ |
| 3 | **filler动态上限** — 8+floor(挂机h/4)+每日仪式2+重生加成 | `electron/main.cjs` | ✅ |
| 4 | **里程碑事件** — 8条白话文本(1h/6h/24h/3d/7d/30d/100d/365d)，只触发一次 | `electron/main.cjs` | ✅ |
| 5 | **每日仪式** — 固定文本，当日filler+2 | `electron/main.cjs` | ✅ |
| 6 | **副本结局+重生** — LV500自动弹特殊弹窗；永久成就「圆满」首次解锁；无限重生；经验+10%封顶+50%；filler+5封顶+25 | `electron/main.cjs`, `src/main.js`, `src/style.css`, `index.html` | ✅ |
| 7 | **副本机制框架** — 5种挂机变体(standard/cultivation/cyber/tide/polar) | `electron/main.cjs`, `build.js` | ✅ |
| 8 | **重生番外框架** — Events表MinRebirth列+findUnusedEvent检查+max_rebirth限制 | `electron/main.cjs`, `build.js` | ✅ |
| 9 | **大厅解锁框架** — unlock_requirement字段+锁定副本灰色UI | `electron/main.cjs`, `build.js`, `src/main.js`, `src/style.css` | ✅ |
| 10 | **结局收藏册框架** — 通关记录存档+历程菜单第4项 | `electron/main.cjs`, `src/main.js`, `index.html` | ✅ |
| 11 | **大厅专属称号** — 20个等级称号(代码内置LV1-500)+通关称号(.md字段)+面板分组+大厅信息补充 | `electron/main.cjs`, `src/main.js`, `index.html` | ✅ |
| 12 | **大厅专属成就** — 10个(等级类+通关数量类+重生类)+面板分组 | `electron/main.cjs`, `src/main.js` | ✅ |
| 13 | **历程菜单扩展** — 4项(称号/成就/事件/结局) | `index.html`, `src/main.js` | ✅ |
| 14 | **状态栏重生标识** — 副本内LV后加(R1)/(R2) | `src/main.js` | ✅ |
| 15 | **CLAUDE.md长期规划章节** — 架构能力/挂机变体/副本增长路线/解锁曲线/大厅称号/大厅成就/UI规划/skill增长引擎 | `CLAUDE.md` | ✅ |
| 16 | **ScenarioWriter skill完整升级** — 四周目结构+5种机制推荐+游戏机制说明+MinRebirth列+新frontmatter字段 | `skills/ScenarioWriter/SKILL.md`, `skills/ScenarioWriter/references/format-rules.md` | ✅ |

### 后续待办

| # | 内容 | 说明 |
|:-:|:-----|:-----|
| - | 用升级后的 skill（第二人称/分段/灯停规则）重新生成 starfield 和 hermit | 现有副本已回退到旧版，需用新 skill 重新生成。先做哪个都行 |
| - | 持续产新副本 | 每周 1-2 个，架构已就位，放进 scenarios/ 即可 |

## v2.7.1 — 配色优化+宠物背景修复+bubble闪烁修复+报时自动展开+UX优化

> **当前阶段：v2.7.1（已完成）**

| # | 内容 | 涉及文件 | 状态 |
|:-:|:-----|:---------|:----:|
| 1 | **配色优化** — 删除6个低对比度主题保留9个，对比度≥10:1，dim层次拉开，白色主题特殊语义色 | `src/style.css`, `pet/style.css`, `src/main.js`(THEMES数组) | ✅ |
| 2 | **宠物窗口背景修复** — info-bar/exp-wrap默认淡显示(opacity:0.3)+悬浮清晰(:hover 1.0)，不加背景色保持透明，text-shadow辅助 | `pet/style.css` | ✅ |
| 3 | **pet bubble闪烁修复** — doShowBubble先更新内容再显示，避免闪旧内容 | `electron/pet-bubble.cjs` | ✅ |
| 4 | **报时自动展开bubble** — chime不进nq队列，直接弹bubble+6秒自动消失，不占用dot | `pet/pet.js`, `pet-bubble/script.js` | ✅ |
| 5 | **删除抽取副本功能** — 按钮+IPC+相关代码全部移除 | `index.html`, `src/main.js`, `electron/main.cjs` | ✅ |
| 6 | **状态栏精简** — 版本号移到设置面板，状态栏只显示核心信息 | `src/main.js`, `index.html`, `src/style.css` | ✅ |
| 7 | **副本卡片加进度** — 通关✓+重生R数/进行中Lv.X | `src/main.js`, `src/style.css` | ✅ |
| 8 | **大厅引导提示** — 未进过副本时显示引导文字 | `src/main.js`, `src/style.css` | ✅ |
| 9 | **EXP进度条加粗** — 6px→10px | `src/style.css` | ✅ |
| 10 | **标题栏升级闪烁** — level-up时LV数字闪烁变色+缩放动画 | `src/main.js`, `src/style.css` | ✅ |

## v2.7.2 — UX优化（基于UI/UX Pro Max skill）

> **当前阶段：v2.7.2（已完成）**
>
> 基于 UI/UX Pro Max skill 的 10 级优先级规则体系，完成 6 项 UI/UX 专业度提升。涉及阅读体验、布局稳定性、z-index 层级、加载反馈、动画性能、字体策略。

| # | 内容 | 涉及文件 | 状态 |
|:-:|:-----|:---------|:----:|
| 1 | **阅读类文本行距加宽** — 故事事件/结局/引导/弹窗描述 line-height 1.6-1.7 | `src/style.css`, `themes/style-guide.md` | ✅ |
| 2 | **侧面板 scrollbar-gutter** — 面板内容不因滚动条出现而抖动 | `src/style.css` | ✅ |
| 3 | **事件/成就弹窗 z-index 抬到 250/251** — 不被侧面板遮挡，临时反馈始终可见 | `src/style.css`, `themes/style-guide.md` | ✅ |
| 4 | **骨架屏加载** — 事件历史面板/结局列表加载时显示呼吸闪烁占位条 | `src/style.css`, `src/main.js` | ✅ |
| 5 | **动画元素 will-change** — 7 组动画元素补 will-change 声明，减少掉帧 | `src/style.css` | ✅ |
| 6 | **font-display: swap** — 5 个 HTML 的 @font-face 补策略，避免字体加载时空白 | `index.html`, `pet/index.html`, `pet-context-menu/index.html`, `pet-selector/index.html`, `pet-bubble/index.html` | ✅ |

## v2.7.3 — 废土副本重写 + Bug修复 + ScenarioWriter优化

> **当前阶段：v2.7.3（已完成）**
>
> 废土副本完整重写为4周目格式（2000story+6782filler+30称号+50成就+52节日）。修复preload白名单缺失8通道导致大厅功能/结局弹窗失效。修复重生上限检查。优化ScenarioWriter skill：串行分步+大纲先行+ID分配表+build.js失败对照表。清理工作区旧脚本。

| # | 内容 | 涉及文件 | 状态 |
|:-:|:-----|:---------|:----:|
| 1 | **废土副本重写** — 4周目完整格式：周目0拾荒建城/周目1流浪医者/周目2机械工程师/周目3探秘终局 | `scenarios/wasteland.md` | ✅ |
| 2 | **preload 白名单修复** — invoke白名单加7通道+on白名单加scenario-ending | `electron/preload.cjs` | ✅ |
| 3 | **重生上限检查** — rebirth-scenario加max_rebirth校验 | `electron/main.cjs` | ✅ |
| 4 | **通关称号UI修复** — game-tick hub分支更新currentTitle | `src/main.js` | ✅ |
| 5 | **ScenarioWriter skill优化** — 串行分步/大纲先行/ID分配表/build.js失败对照表/完整frontmatter模板/备份指引/性能预期 | `SKILL.md` | ✅ |
| 6 | **R0 filler补全** — 补370条至1700对齐密度表 | `scenarios/wasteland.md` | ✅ |
| 7 | **清理旧脚本** — 删除4个生成脚本+测试产物+文档引用修复 | `scenarios/`, `CLAUDE.md`, `package.json` | ✅ |
| 8 | **ScenarioWriter skill重写** — 第二人称叙事/分段生成(每周目5段)/灯停规则/validate_md.cjs自检/Action列说明/BOM防污染 | `Skill.md` | ✅ |
| 9 | **build.js parseTable加精准报错** — 行末缺\|/BOM时直接报行号+原因 | `build.js` | ✅ |
| 10 | **validate_md.cjs格式自检脚本** — 检查BOM/缺尾\|/表中空行，自动修复 | `validate_md.cjs` | ✅ |
| 11 | **回退starfield+hermit副本** — 保持废土独版，待新skill重新生成 | `scenarios/starfield.md`, `scenarios/hermit.md` | ✅ |

## v2.7.4 — 副本管理+反馈面板

> **当前阶段：v2.7.4（已完成）**
>
> 删除不完整的 hermit/starfield 副本。新增归档功能（所有周目通关后可归档隐藏）。新增全部通关催更入口+设置反馈面板（邮箱、导出日志、打开日志文件夹）。

| # | 内容 | 涉及文件 | 状态 |
|:-:|:-----|:---------|:----:|
| 1 | **删除 hermit/starfield** — 移除旧 .md 文件，build.js 重建后仅剩 wasteland | `scenarios/hermit.md`, `scenarios/starfield.md` | ✅ |
| 2 | **归档功能** — 后端 IPC（archive-scenario/unarchive-scenario/get-archived-scenarios、canArchive 校验）+ preload 白名单 + 前端 renderHubCards 分已归档/未归档 + 已归档折叠区 + 样式 | `electron/main.cjs`, `electron/preload.cjs`, `src/main.js`, `src/style.css` | ✅ |
| 3 | **催更入口** — 全部通关后大厅列表底部显示提示卡片，点击打开设置面板，一次性消除（加新副本后重置） | `electron/main.cjs`, `electron/preload.cjs`, `src/main.js`, `src/style.css` | ✅ |
| 4 | **反馈面板** — 设置面板新增反馈区块：邮箱（点击复制）、导出日志到桌面、打开日志文件夹 | `index.html`, `electron/main.cjs`, `electron/preload.cjs`, `src/main.js`, `src/style.css` | ✅ |
