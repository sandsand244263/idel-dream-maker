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
| 4 | **game.rs → game.js** | `src/game.js` (新建) | ✅ |
| 5 | **main.js 通信改造** | `src/main.js` (改), `electron/preload.cjs` (补完) | ✅ |
| 6 | **系统托盘 + 窗口行为** | `electron/tray.cjs`, `electron/windows.cjs` (新建) | ✅ |
| 7 | **清理 Tauri 残余** | 删除 `src-tauri/`, `Cargo.*`, `.cargo/`, `target/` | ✅ |
| 8 | **文档对齐 + 打包测试** | `TASKS.md`, `架构文档.md` (更新) | ✅ |

### 执行顺序说明

每个 Task 完成后 AI 应当自行验证（启动 Electron 或跑脚本），不需要问"好了吗"。遇到报错自行修复再提交。

---

### Task 1 — 初始化 Electron 主进程

**目标：** 替换 Tauri 窗口系统。新建 Electron 主进程，能打开显示当前 HTML 界面。

**前置条件：** 当前工作目录为项目根目录 `E:\工作内容\11_vibe-coding项目\IdleWorker`

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

## 规划（待定）

以下内容在 v1.0 迁移完成后考虑：

| 内容 | 说明 |
|------|------|
| 像素宠物窗口（替换 Mini Bar） | 原 v0.4.0 计划，延后至 Electron 迁移完成后 |
| 节假日系统 | 原 v0.3.8，延后 |
| 新副本（中世纪/赛博/修仙/克苏鲁） | 延后 |
| UI 动效 + 错误提示 + 首次引导 | 延后 |
| Mac 适配 | Electron 天然支持，迁移完成后即可 |
| Steam 上架 | Electron 版本打包后上架 |

---

## 已废弃计划

| 版本 | 原计划 | 原因 |
|------|--------|------|
| v0.4.0 | AI 生成 + 导入导出 + API Key 设置 | 不再开放玩家自制副本 |
| v0.3.8 | 节假日系统 | 优先级低于引擎迁移 |

---

所有工作规范详见 `CLAUDE.md` → **「工作规范」** 章节。
