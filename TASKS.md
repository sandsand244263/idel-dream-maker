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

## v0.1.0 ~ v0.2.1（已完成）

所有前期版本已完成，详情见 `架构文档.md` 版本升级记录。

---

## v0.3.0 — 大厅架构 + 瘦长窗口 + 语言系统

> 当前进度：✅ 全部完成 — v0.3.0 所有 Task 已执行

### Task 1 ✅ — 项目改名 + 窗口尺寸

| 项目 | 值 |
|------|-----|
| 难度 | 低 |
| 预计 | 1h |
| 范围 | 仅配置文件和 HTML title |

**涉及文件：**
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `package.json`
- `index.html`
- `src/main.js`
- `src-tauri/src/game.rs`

**改动清单：**

```
tauri.conf.json:
  - productName: "Idel-DreamMaker"
  - identifier: "com.ideldreammaker.app"
  - version: "0.3.0"
  - app.windows[0].title: "Idel-DreamMaker"
  - app.windows[0].width: 320, height: 840
  - app.windows[0].minWidth: 280, minHeight: 400

Cargo.toml:
  - name: "idel-dream-maker"
  - version: "0.3.0"
  - description: "Idel-DreamMaker - A zero-interaction idle narrative game with Hub system"

package.json:
  - name: "idel-dream-maker"
  - version: "0.3.0"

index.html:
  - <title>Idel-DreamMaker</title>

main.js:
  - 所有 "IdleWorker" → "Idel-DreamMaker"
  - 版本号 "v0.3.0"

game.rs:
  - 存档路径 "IdleWorker" → "Idel-DreamMaker"
```

**验证：** `npm run tauri dev` 启动后窗口标题显示 Idel-DreamMaker，窗口初始尺寸 320×840。

---

### Task 2 ✅ — 字体系统

| 项目 | 值 |
|------|-----|
| 难度 | 低 |
| 预计 | 1h |
| 范围 | 前端 + 字体文件 |

**涉及文件：**
- `src-tauri/fonts/`（新建目录 + 复制字体文件）
- `index.html`
- `src/style.css`

**前置条件：** 字体文件位于 `%LOCALAPPDATA%\Microsoft\Windows\Fonts\`
- `MapleMono-NF-CN-Regular.ttf`（~20MB）
- `MapleMono-NF-CN-Bold.ttf`（~20MB）

**改动清单：**

```
前提:
  - 在 src-tauri/fonts/ 下创建目录
  - 从 %LOCALAPPDATA%\Microsoft\Windows\Fonts\ 复制两个 ttf 到该目录

index.html:
  - <head> 内新增:
    <style>
      @font-face {
        font-family: 'MapleMonoNFCN';
        src: url('src-tauri/fonts/MapleMono-NF-CN-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: 'MapleMonoNFCN';
        src: url('src-tauri/fonts/MapleMono-NF-CN-Bold.ttf') format('truetype');
        font-weight: bold;
        font-style: normal;
      }
    </style>

style.css:
  - :root 中 --font: 'MapleMonoNFCN', 'Courier New', monospace
  - 所有 font-family 引用改为 var(--font)
```

**注意：** Tauri v2 中前端无法直接访问 `src-tauri` 目录下的文件。字体需要作为 **Tauri 资源（resource）** 打包。正确做法：
1. 在 `tauri.conf.json` 的 `bundle.resources` 中添加字体路径
2. 前端通过 Tauri 的 `convertFileSrc` API 获取资源 URL 来加载字体

或者更简单：将字体放在 `src/fonts/`（前端目录），Vite 会自动处理。

**验证：** 启动后 UI 文字显示为 Maple Mono 字体，中英文混排正常。

---

### Task 3 ✅ — Hub 核心：状态架构

| 项目 | 值 |
|------|-----|
| 难度 | 中 |
| 预计 | 2h |
| 范围 | Rust 后端 |

**涉及文件：**
- `src-tauri/src/game.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/scenario.rs`（可能小改）

**改动清单：**

```
game.rs GameState 新增字段:
  + is_in_hub: bool               // default: true
  + hub_total_exp: f64            // default: 0.0
  + scenario_alias: String        // default: ""

game.rs start_game_loop() 修改:
  - 循环开头:
    let game = state.game.lock().unwrap();
    if game.is_in_hub {
        // 仍发送 game-tick 保持 UI 更新
        // 但不增加 EXP/不检查事件/不检查成就
        app_handle.emit("game-tick", GameTickPayload::from(&*game)).ok();
        drop(game);
        thread::sleep(Duration::from_millis(1000));
        continue;
    }
    // 原有逻辑...

game.rs 新增 exit_scenario() 函数:
  fn exit_to_hub(game: &mut GameState) {
      game.hub_total_exp += game.total_exp_earned;
      game.scenario_id = String::new();
      game.level = 1;
      game.exp = 0.0;
      game.total_exp_earned = 0.0;
      game.total_runtime_ms = 0;
      game.triggered_events.clear();
      game.unlocked_achievements.clear();
      game.scenario_alias.clear();
      game.is_in_hub = true;
  }

game.rs reset_game_for_scenario() 修改:
  - 新增参数 alias: String
  - 设置 is_in_hub = false
  - 设置 scenario_alias = alias

lib.rs 新增命令 exit_to_hub():
  - 调用 game::exit_to_hub()
  - 保存存档
  - 返回 is_in_hub = true

lib.rs get_full_state() 修改:
  - 返回 is_in_hub 字段

lib.rs select_scenario() 修改:
  - 新增参数 alias: Option<String>
  - 传递给 reset_game_for_scenario()

注意：存档格式变更后，旧存档无法兼容。
  需在 load_save() 中用 serde(default) 处理缺失字段。
```

**验证：**
1. `cargo check` 编译通过
2. 启动后 `is_in_hub = true` → 大厅界面显示（即使还没 UI，日志应显示系统消息但不涨 EXP）
3. 进入剧本后 `is_in_hub = false` → EXP 正常增长

---

### Task 4 ✅ — Hub 界面

| 项目 | 值 |
|------|-----|
| 难度 | 中 |
| 预计 | 2h |
| 范围 | 前端 HTML + CSS + JS |

**涉及文件：**
- `index.html`
- `src/style.css`
- `src/main.js`
- `src-tauri/src/lib.rs`

**改动清单：**

```
index.html:
  - 将现有 #log-area 作为剧本内视图
  - 新增 #hub-view（默认显示）
    <main id="hub-view">
      <div id="hub-welcome">
        <h2>欢迎回来，<span id="hub-player-name">Worker</span></h2>
        <p>大厅等级 <span id="hub-level">1</span></p>
      </div>
      <div id="hub-scenario-list">
        <!-- 剧本卡片动态渲染 -->
      </div>
      <button id="hub-draw-btn">抽取剧本</button>
    </main>
  - #app 容器用 JS 切换 hub-view / log-area 的 display

main.js:
  - 新增 renderHubView():
    - 显示玩家名 + 大厅等级
    - 从 get_scenario_list 获取所有剧本 → 渲染卡片
    - 每张卡片可点击（进入该剧本）
  - 抽取按钮 → invoke('draw_scenario')
  - 按钮栏根据 is_in_hub 切换:
    - Hub 模式: [剧本] [称号] [状态] [设置] [隐藏]
    - Scenario 模式: [返回大厅] [称号] [状态] [设置] [隐藏]
  - "返回大厅"按钮 → invoke('exit_to_hub') → 重渲染

style.css:
  - #hub-view 样式:
    - 欢迎区：上下居中，大字玩家名 + 小字大厅等级
    - 剧本卡片：列表式，显示名称/描述/进度
    - 抽取按钮：全宽，hover 变化
  - 窄屏 320px 适配

lib.rs:
  - 新增 draw_scenario() 命令:
    - 获取所有剧本 ID 列表
    - 随机返回一个未收藏的（现阶段简单随机）
    - 不存在于 all_scenarios 则新增（以后扩展）
```

**验证：** 启动后看到大厅界面（非日志视图），卡片列表可点击进入剧本，抽取按钮可用。

---

### Task 5 ✅ — 别名 + 大厅等级/称号

| 项目 | 值 |
|------|-----|
| 难度 | 中 |
| 预计 | 2h |
| 范围 | 前端 + Rust |

**涉及文件：**
- `src/main.js`
- `src/style.css`
- `src-tauri/src/lib.rs`
- `index.html`

**改动清单：**

```
lib.rs:
  - select_scenario 新增参数 alias: Option<String>
  - alias 为空字符串时用剧本默认 playerTitle

main.js:
  - 点击剧本卡片进入前弹出别名输入框:
    const alias = prompt('输入该剧本内的名称（留空使用默认）');
    invoke('select_scenario', { id, alias: alias || '' });
  - 大厅称号面板 renderHubTitles():
    - 遍历所有剧本，按剧本分组
    - 每组可展开/折叠（<details>/<summary> 或手风琴）
    - 显示该剧本已解锁的称号数量/总数
  - 大厅等级:
    - 从 gameState.hub_total_exp 计算大厅等级
    - 显示在大厅界面顶部 + 状态面板
    - 公式: floor(sqrt(hub_total_exp / 100)) + 1

index.html:
  - 在 #hub-view 中新增大厅等级显示区域
  - 称号面板中新增分组显示逻辑

style.css:
  - 大厅等级：大号数字，醒目颜色
  - 称号分组：缩进 + 折叠箭头
```

**验证：** 进入剧本时弹出别名输入框，大厅界面显示等级，称号面板按剧本分组可展开。

---

### Task 6 ✅ — 贴边隐藏 + 热修复

| 项目 | 值 |
|------|-----|
| 难度 | 低~中 |
| 预计 | 1.5h |
| 范围 | 前端 + Rust 小改 |

**涉及文件：**
- `src/main.js`
- `src-tauri/src/game.rs`
- `src-tauri/src/lib.rs`
- `index.html`
- `src/style.css`

**改动清单：**

```
贴边隐藏（简化版）:
  main.js 新增 setupEdgeDock():
    - let edgeTimer = null
    - window.addEventListener('mousemove', (e) => {
        // 检测鼠标是否在窗口边缘 5px 内
        if (e.clientX < 5 || e.clientX > window.innerWidth - 5 || e.clientY < 5) {
          if (!edgeTimer) {
            edgeTimer = setTimeout(async () => {
              await invoke('hide_window');
              edgeTimer = null;
            }, 1500); // 停留 1.5s 后隐藏
          }
        } else {
          if (edgeTimer) { clearTimeout(edgeTimer); edgeTimer = null; }
        }
      });
    - 注意：mousemove 坐标是相对窗口的，检测"鼠标到窗口边缘"。
      真正的"窗口到屏幕边缘"需要轮询窗口位置（跨平台略复杂），
      先用鼠标到窗口边缘做近似实现。

托盘恢复：
  - 已有 TrayIconBuilder.on_tray_icon_event
  - 左键单击 → show_window（已有）
  - 鼠标悬停 → 无操作（后续可加）

热修复 v0.2.1:
  - 状态面板改为 modal（已有 index.html 的 #about-panel，确保 z-index 足够）
  - 托盘 tooltip 动态更新:
    game.rs start_game_loop() 中每 30s:
      let title = get_current_title(&scenario, game.level);
      let tooltip = format!("Lv.{} {} | 挂机 {}", game.level, title.name, format_runtime(game.total_runtime_ms));
      tray.set_tooltip(&tooltip).ok();
    lib.rs 中需要导出 tray 引用或全局访问。
    简化方案：在 start_game_loop 中通过 app_handle.tray_handle() 获取 tray 引用
    注意：Tauri v2 中 tray 通过 app_handle.tray_by_id() 获取

简化实现：省去 set_tooltip 改动，仅修复状态弹窗。
```

**验证：** 鼠标移到窗口边缘停留 1.5s 后窗口自动隐藏；托盘左键点击恢复。

---

### Task 7 ✅ — 语言系统

| 项目 | 值 |
|------|-----|
| 难度 | 中 |
| 预计 | 1.5h |
| 范围 | 前端 + Rust |

**涉及文件：**
- `src/main.js`
- `index.html`
- `src-tauri/src/game.rs`
- `src-tauri/src/lib.rs`
- `src/style.css`

**改动清单：**

```
game.rs:
  - GameState 新增字段:
    + language: String         // default: "zh"
    + ai_output_language: String  // default: "zh"

lib.rs:
  - 新增命令 set_language(lang: String)
  - 新增命令 set_ai_output_language(lang: String)

main.js:
  - 新增 LANG 翻译映射表:
    const LANG = {
      zh: {
        btnScenario: '剧本',
        btnTitles: '称号',
        btnStatus: '状态',
        btnSettings: '设置',
        btnHide: '隐藏',
        btnBack: '返回大厅',
        btnDraw: '抽取剧本',
        titleScenario: '剧本选择',
        titleTitles: '称号一览',
        titleSettings: '设置',
        titleStatus: '状态',
        titleAbout: '关于',
        labelName: '名称',
        labelTheme: '主题',
        labelLanguage: '界面语言',
        labelAILanguage: 'AI 输出语言',
        labelLevel: '等级',
        labelHubLevel: '大厅等级',
        labelTitle: '称号',
        labelRuntime: '时长',
        labelAchievement: '成就',
        labelScenario: '剧本',
        labelPlayer: '玩家',
        labelVersion: '版本',
        welcomeBack: '欢迎回来',
        systemLoaded: '加载完成',
        // ... 所有 UI 文本
      },
      en: {
        btnScenario: 'Scenarios',
        btnTitles: 'Titles',
        btnStatus: 'Status',
        btnSettings: 'Settings',
        btnHide: 'Hide',
        btnBack: 'Back',
        btnDraw: 'Draw',
        titleScenario: 'Scenarios',
        // ...
      }
    };
  
  - 新增 t(key) 函数:
    function t(key) {
      const lang = gameState?.language || 'zh';
      return LANG[lang]?.[key] || LANG.zh[key] || key;
    }
  
  - 所有 UI 渲染调用 t() 获取文本
  - 当 language 变更时重新渲染当前视图

index.html:
  - 设置面板新增:
    <div class="setting-row">
      <label data-i18n="labelLanguage">界面语言</label>
      <select id="settings-language">
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
    </div>
    <div class="setting-row">
      <label data-i18n="labelAILanguage">AI 输出语言</label>
      <select id="settings-ai-language">
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
    </div>

style.css:
  - 设置面板下拉框宽度适配
```

**验证：** 设置面板切换语言后 UI 文字即时切换中/英。

---

## v0.3.1 — Mini Bar + 别名弹窗 + 字体调大

> 当前进度：✅ 全部完成 — v0.3.1

### Task 1 ✅ — 字体调大 + 删贴边隐藏

| 项目 | 值 |
|------|-----|
| 难度 | 低 |
| 预计 | 15min |
| 范围 | CSS + JS |

**改动清单：**

```
style.css:
  - 全局 font-size: 12px → 14px
  - 状态栏 label font-size: 9px → 11px
  - 日志 font-size 保持 14px
  - 按钮 font-size: 10px → 12px
  - 弹窗/面板各字号按比例调大

main.js:
  - 删除整个 "// ── Edge Dock ──" 代码块（mousemove + edgeTimer 约 20 行）
```

### Task 2 ✅ — 别名弹窗 UI 化

| 项目 | 值 |
|------|-----|
| 难度 | 中 |
| 预计 | 30min |
| 范围 | HTML + CSS + JS |

**改动清单：**

```
index.html:
  - 新增 #alias-modal（覆盖全屏遮罩 + 居中弹窗）
    <div id="alias-modal" class="hidden">
      <div id="alias-box">
        <div id="alias-title">进入剧本</div>
        <div id="alias-desc"></div>
        <input type="text" id="alias-input" placeholder="输入名称（留空用默认）" />
        <div id="alias-buttons">
          <button id="alias-cancel">取消</button>
          <button id="alias-confirm">进入</button>
        </div>
      </div>
    </div>

style.css:
  - #alias-modal: fixed 全屏, 半透明黑色遮罩, z-index 300
  - #alias-box: 居中, 主题色边框, 深色背景, 与游戏统一字体配色
  - #alias-input: 同设置面板 input 风格
  - #alias-buttons: 并排两按钮

main.js:
  - 新增 showAliasModal(scenarioName) → Promise<string|null>
  - 替换所有 window.prompt() 调用
  - 取消按钮返回 null, 确认按钮返回输入值
```

### Task 3 ✅ — Mini Bar 模式

| 项目 | 值 |
|------|-----|
| 难度 | 大 |
| 预计 | 2h |
| 范围 | HTML + CSS + JS + Rust |

**设计规格：**

```
Mini Bar 尺寸: 250 × 80
背景: rgba(10, 10, 10, 0.85) 半透明
行为: 始终置顶 (always_on_top), 无装饰边框 (decorations: false)，整个区域可拖拽
布局:
  ┌──────────────────────┐
  │ [▶] Lv.5  拾荒者     │  ← 展开按钮 + 等级 + 称号（行1, 30px）
  │ ████████████░░░ 62%  │  ← EXP 进度条 + 百分比（行2, 20px）
  │                    [-] [×] │  ← 收起 / 关闭 靠右（行3, 30px）
  └──────────────────────┘

切换流程:
  [▶] → set_window_mode("full") → 320×840, 有边框, 取消置顶
  [-] → set_window_mode("mini") → 250×80, 无边框, 置顶
  [×] → hide_window() → 隐藏到托盘
```

**改动清单：**

```
index.html:
  - 新增 #mini-bar 固定于 body 底部（只在 mini 模式显示）
    <div id="mini-bar" class="hidden">
      <div id="mini-row1">
        <button id="mini-expand">▶</button>
        <span id="mini-level">Lv.1</span>
        <span id="mini-title">拾荒者</span>
      </div>
      <div id="mini-row2">
        <div id="mini-progress-bar"><div id="mini-progress-fill" style="width:0%"></div></div>
        <span id="mini-pct">0%</span>
      </div>
      <div id="mini-row3">
        <button id="mini-collapse">─</button>
        <button id="mini-close">×</button>
      </div>
    </div>

style.css:
  - #mini-bar: fixed bottom, 250×80, 半透明背景, border, z-index 500
  - #mini-row1/2/3 布局
  - #mini-progress-bar: 全宽, 深色背景, 圆角
  - #mini-progress-fill: 绿色渐变填充, 过渡动画
  - #mini-expand/collapse/close: 按钮样式

main.js:
  - 新增 switchMiniMode() / switchFullMode()
  - Mini 模式下:
    - 更新等级/称号/进度条(pct + fill width)
    - [▶] 触发 invoke('set_window_mode', { mode: 'full' })
    - [-] 触发 invoke('set_window_mode', { mode: 'mini' })
    - [×] 触发 hide_window
  - 在 game-tick 事件中同步 Mini Bar 更新
  - 拖拽: mousedown 调用 window.start_dragging()

lib.rs:
  - 新增 set_window_mode(mode: String, window: Window) 命令
    - "mini": decorations=false, always_on_top=true, LogicalSize(250,80)
    - "full": decorations=true, always_on_top=false, LogicalSize(320,840)
  - 注册新命令
```

### Task 4 ✅ — 托盘 tooltip 修复

| 项目 | 值 |
|------|-----|
| 难度 | 低 |
| 预计 | 10min |

**改动清单：**

```
game.rs:
  - 确认 tray_by_id("main") 获取正确
  - Hub 模式 tooltip: "Idel-DreamMaker | 大厅 Lv.X"
  - 剧本模式 tooltip: "Lv.X 称号 | 已挂机 XhXm"
```

---

## v0.4.0（规划中）

> 以下为规划内容

- `.md` 剧本解析器（Rust 端读取 frontmatter + 表格）
- AI 生成剧本（用户自备 API Key，调用 OpenAI 兼容接口）
- 剧本导入/导出/增删（删除时清理关联存档）
- 语言联动：AI 生成时按 `ai_output_language` 输出

---

## v1.0（规划中）

> 以下为规划内容

- Steamworks 集成（条件编译）
- Steam 云存档
- P2P 联机（Lobby + 好友同玩 + 共同探索时长 + 组队经验加成）
- 贴边隐藏完整版（4px 细边 + 悬停动画）
- Mac 适配

---

## 规范

- 每个 Task 执行前：`git add -A && git commit -m "快照: YYYY-MM-DD v0.3.0 TaskN 前"`
- 每个 Task 执行后：更新 TASKS.md 中对应 Task 标记为 ✅
- 整个版本完成后：更新架构文档.md 版本记录 + 进度表
- 最终：`git add -A && git commit -m "v0.3.0: 版本说明"`
