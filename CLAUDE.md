# CLAUDE.md — IdleWorker 项目主文档

**新 AI 会话请先读此文件。所有游戏规则、数据结构和开发约束在此定义。**

---

## 项目一句话定义

> IdleWorker = 藏在系统托盘/菜单栏里的纯文字挂机叙事游戏。零交互，时间累积等级，随机弹出故事事件，支持多剧本和全球节假日系统。

---

## 核心规则（AI 必须遵守）

1. **所有事件文本用 AI 批量生成后放入剧本 JSON**，不在代码里硬编码文本
2. **游戏是零交互的**——没有按钮、没有点击、没有选择分支。纯挂机 + 偶尔阅读
3. **Steamworks 集成为可选项**——代码里条件编译，不强制依赖 Steam
4. **跨平台**——Windows 用系统托盘，macOS 用菜单栏图标
5. **所有数据文件用 JSON**，不做数据库
6. **存档单文件**——存于 `%APPDATA%/IdleWorker/save.json`（Win）或 `~/Library/Application Support/IdleWorker/save.json`（Mac）

---

## 数据规格

| 项目 | 数值 | 说明 |
|------|------|------|
| EXP 速率 | 1 EXP/s | 恒定不变 |
| 等级上限 | 无限制 | 永续增长 |
| 称号等级段 | 30 级/剧本 | 约 1-2 天解锁一级 |
| 事件文本 | 500 条/剧本 | AI 批量生成 |
| 成就 | 50 个/剧本 | 等级/时长/事件/收集四类 |
| 节假日事件 | 全年覆盖 | 独立事件池，不占用剧本名额 |
| 日志保留 | 不限 | 内存中保留全部，界面滚动查看 |
| 存档 | 单存档 | 切换剧本时重置等级，玩家可自定义角色名 |

---

## 剧本 JSON Schema

每个剧本一个 JSON 文件，结构如下：

```json
{
  "id": "wasteland",
  "name": "Wasteland",
  "nameCN": "废土",
  "description": "核战后的废土世界，辐射尘覆盖大地，幸存者在废墟中挣扎求生。",
  "playerTitle": "拾荒者",

  "titles": [
    { "level": 1,   "name": "拾荒者",   "color": "#888888",  "desc": "在废墟中翻找食物残渣" },
    { "level": 3,   "name": "幸存者",   "color": "#AAAAAA",  "desc": "活过了第一周" },
    { "level": 6,   "name": "开拓者",   "color": "#4CAF50",  "desc": "建立了临时营地" },
    { "level": 10,  "name": "探索者",   "color": "#2196F3",  "desc": "开始探索更远的区域" },
    { "level": 15,  "name": "猎手",     "color": "#FF9800",  "desc": "能够猎杀变异生物" },
    { "level": 20,  "name": "建造者",   "color": "#795548",  "desc": "重建了第一栋建筑" },
    { "level": 26,  "name": "领袖",     "color": "#9C27B0",  "desc": "聚集了一群追随者" },
    { "level": 33,  "name": "指挥官",   "color": "#F44336",  "desc": "指挥着一支武装力量" },
    { "level": 40,  "name": "城主",     "color": "#E91E63",  "desc": "统治着一座小型定居点" },
    { "level": 48,  "name": "将军",     "color": "#FF5722",  "desc": "统领多个据点的军事力量" },
    { "level": 56,  "name": "贤者",     "color": "#00BCD4",  "desc": "掌握着失落的科技知识" },
    { "level": 65,  "name": "大领主",   "color": "#673AB7",  "desc": "势力范围覆盖大片废土" },
    { "level": 75,  "name": "复兴者",   "color": "#FFEB3B",  "desc": "推动着文明的复兴" },
    { "level": 85,  "name": "传奇",     "color": "#FF9800",  "desc": "名字在废土上被传颂" },
    { "level": 100, "name": "理想乡",   "color": "#00E676",  "desc": "你种下的种子已长成森林" },

    { "level": 120, "name": "神话",     "color": "#E040FB",  "desc": "超越了人类的极限" },
    { "level": 150, "name": "先驱",     "color": "#FF6D00",  "desc": "为文明开辟了新的道路" },
    { "level": 200, "name": "不朽",     "color": "#FF1744",  "desc": "刻入了废土的历史" },
    { "level": 300, "name": "创世",     "color": "#00E5FF",  "desc": "废土因你而重生" },
    { "level": 500, "name": "???",      "color": "#FFFFFF",  "desc": "超越了认知的极限" }
  ],

  "events": [
    {
      "id": "w_e001",
      "minLevel": 1,
      "minHours": 0,
      "weight": 10,
      "once": true,
      "text": "你从避难所中醒来。辐射尘在晨光中闪闪发光，像一场永远不会停的雪。远处传来金属的碰撞声——有人，或者什么东西，正在靠近。"
    }
  ],

  "achievements": [
    {
      "id": "wa_first_step",
      "name": "第一步",
      "desc": "达到等级 5",
      "icon": "★",
      "condition": { "type": "level", "value": 5 }
    },
    {
      "id": "wa_veteran",
      "name": "老练",
      "desc": "运行满 24 小时",
      "icon": "⏱",
      "condition": { "type": "runtime", "value": 86400000 }
    }
  ]
}
```

---

## 存档结构

```json
{
  "playerName": "玩家自定义名称",
  "scenarioId": "wasteland",
  "level": 12,
  "exp": 3480.5,
  "totalExpEarned": 12000.0,
  "totalRuntimeMs": 43200000,
  "lastSaveTime": 1718000000000,
  "equippedTitleIndex": 4,
  "triggeredEvents": ["w_e001", "w_e005", "w_e012"],
  "unlockedAchievements": ["wa_first_step"],
  "selectedFontTheme": "green"
}
```

---

## 事件触发逻辑

```
每次触发时机：
  每 60 秒检查一次
  触发概率：前 12 小时 40%/次，之后 30%/次，72 小时后 15%/次
  平均间隔：前期 ~2.5 分钟，中期 ~3.3 分钟，后期 ~6.7 分钟

选择事件：
  1. 首先检查是否有节假日匹配（当天日期）→ 如有，从节假日池抽
  2. 否则从当前剧本的事件池抽
  3. 过滤：minLevel <= 当前等级，minHours <= 已运行小时数
  4. once=true 的事件只触发一次
  5. 按 weight 权重随机选择

弹窗行为：
  右下角弹出，持续 6 秒自动消失
  成就弹窗更突出，持续 8 秒
  可点击弹窗提前关闭
```

---

## 节假日系统规则

```
检测频率：每次事件触发时
检测方式：匹配当前系统日期的月/日
匹配时：从该节日的事件池中抽取，不占剧本事件名额
同时命中多个节日时：全球性 > 区域性 > 虚构游戏内节日
```

节假日事件池结构：

```json
{
  "holidays": [
    {
      "id": "new_year",
      "name": "元旦",
      "date": { "month": 1, "day": 1 },
      "priority": "global",
      "events": [
        { "text": "新年的第一缕阳光透过辐射云照亮了废土。" },
        { "text": "你在废墟中找到一个完好的日历——今天是一月一日。" }
      ],
      "perScenarioTexts": {
        "wasteland": [],
        "medieval": [],
        "cyberpunk": [],
        "cultivation": [],
        "cthulhu": []
      }
    }
  ]
}
```

`perScenarioTexts` 是可选的剧本定制版。如果为空，则使用通用 `events`。

---

## 字体方案

预设多套供玩家选择：

| 方案名 | 前景色 | 背景色 | 字体 | 氛围 |
|--------|--------|--------|------|------|
| green | #00FF00 | #0A0A0A | Courier New | 经典黑客终端 |
| amber | #FFB000 | #0A0A0A | Courier New | 暖色复古终端 |
| cold | #E0E0E0 | #1A1A2E | Consolas | 冷白/蓝暗黑 |
| paper | #222222 | #F5F0E8 | "Times New Roman" | 仿纸质书 |
| matrix | #00FF41 | #000000 | "Lucida Console" | 《黑客帝国》风 |

---

## 开发指引

### 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Tauri v2 |
| 后端语言 | Rust |
| 前端 | HTML + CSS + JS（无框架） |
| Steam 集成 | `steamworks` crate（条件编译） |
| 存档 | JSON 文件通过 Rust 读写 |
| 剧本数据 | JSON 文件随程序打包 |

### 跨平台托盘

| 平台 | 实现方式 |
|------|---------|
| Windows | `tauri::tray::TrayIconBuilder`（已实现） |
| macOS | `tauri::tray::TrayIconBuilder`（Tauri 自动适配菜单栏） |

### Steamworks 集成（预留）

```rust
// Cargo.toml
// [dependencies]
// steamworks = "0.13"  // 可选，条件编译

#[cfg(feature = "steam")]
fn unlock_achievement(id: &str) {
    if let Ok(client) = steamworks::Client::init() {
        client.achievements().set_achievement(id);
    }
}
```

### 里程碑

1. **引擎核心**：托盘图标 + 存档 + 挂机循环 + 称号 + 终端 UI
2. **事件引擎**：剧本 JSON + 随机触发 + 弹窗 + 剧本选择
3. **成就系统**：条件检测 + 本地弹窗 + Steamworks 预留
4. **剧本填充**：AI 生成事件文本
5. **节假日系统**：日期检测 + 独立事件池
6. **Mac 适配**：菜单栏适配
7. **Steam 上架**：注册 + 配置 + 构建 + 提审
