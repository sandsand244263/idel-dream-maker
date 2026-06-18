# Idel-DreamMaker 样式规范

> 所有前端组件（主窗口 + 宠物窗口 + 上下文菜单 + 气泡窗口 + 宠物选择器）共用此规范。
> 新建样式文件时必须遵循。

---

## 1. 色彩体系

### 1.1 核心变量

每个 CSS 文件的 `:root` 必须定义以下 4 个颜色变量：

| 变量 | 默认值（绿色主题） | 用途 |
|------|-------------------|------|
| `--fg` | `#00FF00` | 前景色（文字、图标、高亮） |
| `--bg` | `#0A0A0A` | 背景色（主窗口不透明，子窗口半透明） |
| `--dim` | `#00AA00` | 次级色（辅助文字、图标、重要分隔线） |
| `--border` | `rgba(0,255,0,0.2)` | 边框色（面板边框、卡片边框） |

子窗口（pet、context-menu、bubble、selector）的 `--bg` 带透明度：

| 窗口 | `--bg` 值 |
|:----|:----------|
| 主窗口 | `#0A0A0A`（不透明） |
| 宠物窗口 | `rgba(10,10,10,0.85)` |
| 上下文菜单 | `rgba(10,10,10,0.85)` |
| 宠物选择器 | `rgba(10,10,10,0.85)` |
| 气泡窗口 | `rgba(10,10,10,0.85)` |

### 1.2 14 套主题

每个 CSS 文件的 `.theme-*` 类必须定义 `--fg`、`--bg`、`--dim`、`--border` 四个变量。
主窗口额外定义 `--g1`、`--g2`（渐变起止色）。

### 1.3 着色写法规则

**正确 ✅**
```css
background: color-mix(in srgb, var(--fg) 8%, transparent);
border-bottom: 1px solid color-mix(in srgb, var(--fg) 4%, transparent);
color: color-mix(in srgb, var(--fg) 65%, transparent);  /* 正文次级文本 */
```

**禁止 ❌**
```css
background: rgba(0,255,0,0.08);         /* 固定绿色，不跟随主题 */
border-bottom: 1px solid rgba(255,255,255,0.04);  /* 固定白色，不跟随主题 */
color: #E0E0E0;                         /* 固定灰色，不跟随主题 */
```

### 1.4 语义色（固定，不随主题变化）

| 颜色 | 用途 | 说明 |
|:----|:-----|:------|
| `#FFD700` 金 | 成就图标、成就名称 | 成就专属 |
| `#F44336` 红 | 关闭按钮 hover、错误提示 | 危险/关闭语义 |
| `#4CAF50` 绿 | 成功 Toast | 成功语义 |
| `#00E5FF` 青 | 成就弹窗边框、成就弹窗 header | 成就专属 |
| `#FF9800` 橙 | 事件日志前缀 `[!]` | 事件标记 |
| `#FFEB3B` 黄 | 升级日志前缀 `[UP]` | 升级标记 |
| `#00BFFF` 天蓝 | 事件通知圆点、气泡 header | 事件标记 |
| `#FF9E64` 橙 | 报时通知圆点 | 报时标记 |

---

## 2. 字体

### 2.1 字体变量

所有 CSS 文件统一用 `--font` 变量：

```css
--font: 'MapleMonoNFCN', 'Courier New', monospace;
```

禁止在 `html, body` 中硬编码字体。

### 2.2 字号层级

| 级别 | 大小 | 用途 |
|:----|:-----|:------|
| Level 1 | **14px** | 主标题（`#hub-player-name`、弹窗标题） |
| Level 2 | **12px** | 正文默认、面板标题、卡片名称 |
| Level 3 | **11px** | 次级文本（按钮、描述、日志条目） |
| Level 4 | **10px** | 辅助文本（状态栏、hint、日期） |
| Level 5 | 9px | 极小型（disclaimer 声明） |

默认：`html, body { font-size: 12px; }`

### 2.3 font-weight

| 权重 | 用途 |
|:----|:------|
| `bold` | 仅标题、名称、重要标签 |
| 普通 | 其他全部 |

### 2.4 line-height

| 值 | 用途 |
|:---|:------|
| `1.4` | 默认正文（`html, body`） |
| `1.5` | 多行文本（弹窗描述、事件文本） |
| `1.0` | 单行紧凑（info bar、exp detail） |

---

## 3. 间距与布局

### 3.1 padding 层级

| 级别 | 大小 | 用途 |
|:----|:-----|:------|
| L | **8px** | 面板内容、卡片内边距 |
| M | **6px** | 列表项、按钮垂直间距 |
| S | **4px** | 紧凑型、状态栏 |

### 3.2 gap 层级

| 级别 | 大小 | 用途 |
|:----|:-----|:------|
| L | **8px** | 弹窗按钮间距、flex 项间距 |
| M | **6px** | 表单行间距 |
| S | **4px** | 紧凑型 flex 容器 |

---

## 4. 圆角

| 级别 | 大小 | 用途 |
|:----|:-----|:------|
| L | **8px** | 主窗口、面板、容器、卡片 |
| M | **4px** | 按钮、输入框、内嵌卡片、confirm box |
| S | **2px** | 滚动条 thumb |
| 圆形 | **50%** | 通知圆点 |

---

## 5. 边框

- 所有元素边框统一使用 `--border` 变量
- 重要结构分隔线（titlebar 底边、status bar 顶边）使用 `--dim` 保持对比度
- 分割线使用 `color-mix(in srgb, var(--fg) 4%, transparent)`

---

## 6. 交互反馈

| 状态 | 样式 |
|:----|:------|
| `:hover` | `background: color-mix(in srgb, var(--fg) 10%, transparent); color: var(--fg);` |
| `:active` | `transform: scale(0.96)`（按钮 / 卡片 / 列表项全部统一） |
| close 按钮 `:hover` 特例 | `background: rgba(244,67,54,0.3); color: #F44336;` |
| `:focus` | 输入框 `outline: none; border-color: var(--fg);` |
| `transition` 通用 | `0.15s`（背景、颜色、边框变化） |
| `transition` 紧凑 | `0.12s`（hover 高亮、下拉菜单项） |
| `transition` 慢速 | `0.5s`（进度条宽度变化） |

---

## 7. 关闭按钮

所有关闭按钮统一规格：

| 属性 | 值 |
|:----|:----|
| 符号 | `✕`（Unicode `\2715`） |
| 字号 | 14px |
| 宽高 | 无固定（由内容撑开） |
| `:hover` | `color: var(--fg)` |
| `:active` | `transform: scale(0.96)` |
| 标题栏关闭按钮特例 | 28x28px、字号 11px、`:hover` 红色背景 |

---

## 8. 层叠 (z-index) 层级

不同窗口独立分层，同一窗口内按此规范：

| z-index | 元素 |
|:--------|:------|
| 12 | 宠物通知圆点 |
| 13 | 宠物气泡区域 |
| 100 | 事件弹窗 overlay |
| 101 | 成就弹窗 overlay |
| 200 | 侧面板（称号/成就/设置/副本/事件） |
| 300 | 下拉菜单（历程菜单）、别名弹窗 |
| 350 | 确认弹窗 |
| 400 | 引导弹窗 |
| 500 | Toast |
| 999 | Debug 面板 |

---

## 9. 符号统一

| 符号 | Unicode | 用途 |
|:----|:--------|:------|
| `✕` | `\2715` | 关闭按钮 |
| `▶` | `\25B6` | 展开（折叠→展开） |
| `▼` | `\25BC` | 收起（展开→折叠） |
| `◄` | `\25C4` | 返回（导航返回） |
| `✓` | `\2713` | 开关开启 |
| `✗` | `\2717` | 开关关闭 |

---

## 10. 动画规范

### 10.1 出现动画

| 用途 | 名称 | 时长 | 缓动 |
|:----|:-----|:-----|:------|
| 日志条目出现 | `fadeIn` | 0.2s | ease-out |
| 弹窗滑入 | `slideIn` | 0.3s | ease-out |
| 面板滑入 | `panelSlideIn` | 0.15s | ease-out |
| Toast 出现 | `toastIn` | 0.2s | ease-out |

### 10.2 消失动画

| 用途 | 名称 | 时长 | 缓动 |
|:----|:-----|:-----|:------|
| 弹窗滑出 | `slideOut` | 0.15s | ease-in forwards |
| Toast 消失 | `toastOut` | 0.15s | ease-in forwards |

### 10.3 循环动画

| 用途 | 名称 | 时长 | 缓动 |
|:----|:-----|:-----|:------|
| 通知圆点脉冲 | `pulse` | 1.5s | ease-in-out infinite |
| 宠物浮动 | `floatIdle` | 3s | ease-in-out infinite |
| 进度条扫光 | `shimmer` | 3s | ease-in-out infinite |
| 保存指示 | `savePulse` | 0.6s | ease-in-out (3次) |

### 10.4 规则

- 出现动画用 `ease-out`，消失动画用 `ease-in forwards`
- 循环动画用 `ease-in-out infinite`
- 所有 CSS 文件必须有 `prefers-reduced-motion` 支持

---

## 11. 滚动条

全部统一：

```css
*::-webkit-scrollbar { width: 4px; }
*::-webkit-scrollbar-track { background: var(--bg); }
*::-webkit-scrollbar-thumb { background: var(--dim); border-radius: 2px; }
```

---

## 12. 各 CSS 文件结构模板

```
1. 全局重置  (*, *::before, *::after)
2. :root 变量声明
3. 14 套 .theme-* 定义
4. html, body 基础样式
5. 各组件样式（按页面逻辑分组）
6. @media (prefers-reduced-motion)
7. .hidden { display: none !important; } （最后）
```

---

## 13. 受管文件清单

| 文件 | 窗口 |
|:----|:------|
| `src/style.css` | 主窗口（大厅 + 副本界面） |
| `pet/style.css` | 宠物窗口 |
| `pet-context-menu/style.css` | 右键上下文菜单 |
| `pet-bubble/style.css` | 事件气泡窗口 |
| `pet-selector/style.css` | 宠物选择器窗口 |
