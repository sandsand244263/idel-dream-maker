# 副本 .md 格式规范

副本文件是 Markdown 格式，包含 YAML frontmatter 和多个 pipe table 章节。

## Frontmatter

文件开头用 `---` 包裹的 YAML 元数据：

```yaml
---
id: wasteland               # 副本唯一 ID（小写字母 + 数字 + 下划线）
name: Wasteland             # 英文名称
name_cn: 废土               # 中文名称
description: 核战后的废土世界...  # 副本描述（一句话）
player_title: 拾荒者         # 玩家初始称号
language: zh                # 固定 zh
mechanic: standard          # 挂机机制：standard / cultivation / cyber / tide / polar
branches: [survivor, merchant, fugitive, ai]  # 分支列表，每个分支名用英文
unlock_requirement:         # 解锁条件
  completions: 0            # 需要通关世界数（v4 递进解锁）
completion_title: 灰烬新生   # 通关后解锁的大厅称号（各结局可独立设不同称号）
---
```

### mechanic 可选值

| 值 | 行为 | 适合主题 |
|----|------|---------|
| `standard` | 1 EXP/s 恒定 | 废土、隐居、日常 |
| `cultivation` | 白天（6-18点）1.5x，夜晚 0.7x | 修仙、武侠 |
| `cyber` | 每 10 分钟 5% 概率故障暂停 30 秒，补偿 60 秒 2x | 赛博、科幻 |
| `tide` | 每 6 小时周期，前 10 分钟 2x | 海岛、渔村 |
| `polar` | 夏季正常，冬季 0.5x | 极地、雪山 |

### branches（分支列表）

定义副本有哪些分支路线。玩家在**共享开篇末段**通过抉择选择其中一条，之后固定走该分支直到**分支结局**（CompletionTitle 事件）。

每个分支拥有独立的 ~250-350 段 story 事件。分支间的事件通过 Branch 列过滤。**Branch 列值 `hidden` = 隐藏链**（全分支通关后激活）。

## Titles 称号表（v4：旅程进度条件）

| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| Level | 否 | 兼容旧格式的等级解锁（1-500）；使用 Condition 时留空 | |
| Name | 是 | 称号名称 | 拾荒者 |
| Color | 是 | 十六进制颜色（含 #） | #888888 |
| Description | 是 | 称号描述 | 你在废墟中翻找食物残渣 |
| ConditionType | 否 | 解锁条件类型：`level` / `opening` / `first_choice` / `branch` / `all_branches` / `hidden`（留空=默认 level） | opening |
| ConditionValue | 否 | 条件值：level=宠物等级；branch=分支名；其余留空 | survivor |

**条件类型**：

| 类型 | 触发条件 | ConditionValue |
|:----|:---------|:---------------|
| `level` | 宠物等级达到 | 等级数字（如 100） |
| `opening` | 共享开篇读完（序章完成） | 留空 |
| `first_choice` | 做出首次分支抉择 | 留空 |
| `branch` | 通关指定分支（结局读完） | 分支名（如 survivor） |
| `all_branches` | 全分支通关 | 留空 |
| `hidden` | 隐藏链激活（读完至少 1 段） | 留空 |

**要求：15-20 个/世界，含序章/首次抉择/通关分支/隐藏各阶段。**

## Events 事件表

20 列完整格式。每行 pipe table 以 `|` 开头和结尾，共 20 列：

| ID | Type | MinSeconds | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| {id}_e0001 | story | 0 | 0 | 1 | 是 | | | | | | | | | | | | | 觉醒 | 30-80字的故事文本 |

### 列说明

| 列名 | 必填 | 类型 | 说明 |
|------|------|------|------|
| ID | 是 | 字符串 | `{id}_e{四位编号}`。choice target 用 `e{编号}a` / `e{编号}b` / `e{编号}c` / `e{编号}d` |
| Type | 是 | 枚举 | 固定为 `story`（v3.4.0 起只有 story，无 filler） |
| MinSeconds | 否 | 整数 | **解锁所需累计有效时长（秒）**。事件按此升序构成故事链；**choice target 固定为 0**（读完 choice 立即解锁） |
| MinHours | 否 | 整数 | 固定为 0 |
| Weight | 否 | 整数 | 固定为 1 |
| Once | 否 | 是/否 | 全部为 是 |
| Branch | 否 | 字符串 | 分支归属。空=共享事件，非空=只在该分支触发（如 `merchant`）；**`hidden`=隐藏链**（全分支通关后激活） |
| FlagSet | 否 | 字符串 | 触发时设旗标，如 `helped_merchant=true` 或 `reputation+=5`。多个用 `;` 分隔 |
| FlagRequire | 否 | 字符串 | 触发条件，如 `helped_merchant=true`。`;`/`&`=AND，`\|`=OR；裸键名=存在即满足。支持 >、>=、<、<=、== |
| CompletionTitle | 否 | 字符串 | **结局标记**：有值 = 分支结局事件（读完触发通关）。必须位于该分支链末尾（MinSeconds 最大） |
| Choice1~Choice4 | 否 | 字符串 | 选项按钮文字（10 字以内）。有值则本条为 choice 事件 |
| Choice1Target~Choice4Target | 否 | 字符串 | 选该选项后触发的事件 ID，必须存在 |
| Action | 否 | 字符串 | 核心动作关键词（如"翻找"、"修水管"），用于校验文本多样性 |
| Text | 是 | 字符串 | 30-80 字的故事文本 |

### 事件类型

| 类型 | 数量（每分支） | 触发方式 | 说明 |
|:----|:----:|:---------|:-----|
| `story` | ~250-350/分支 | 有效时长达到 MinSeconds 解锁 | 推动剧情主线 |
| `story`（choice） | 10-15/分支 | 解锁时直接弹抉择，带 2-4 个按钮 | 分支走向或旗标设定，文本通常较短（30 字左右） |
| `choice target` | 20-45/分支 | 选择后立即解锁（MinSeconds=0） | 选择后的叙事 |

### choice 事件规则

choice 事件 = 在 story 事件上加 Choice1~Choice4 及对应 Target 列。支持 2-4 个选项。

- Choice1 有值 → 本条视为 choice 事件，气泡显示对应数量按钮
- Target 指向的目标事件必须是同一副本内的 story 事件（不加 Choice 列）
- Target 事件 ID 用 `{编号}a` / `{编号}b` / `{编号}c` / `{编号}d`，**MinSeconds=0**（读完 choice 立即解锁，不卡时间）
- **共享开篇末段固定为分支抉择**：4 个选项，每个 target 的 Branch 字段决定分支归属

### 分支结构

| 部分 | 时间跨度 | 事件数 | 说明 |
|------|------|:------:|------|
| 共享开篇 | 0 - ~2h | 30-50 | 序章 + 首个分支抉择，所有分支共用 |
| 分支A | 开篇后 ~83-117h | 250-350 | 玩家选择后固定走此分支直到结局 |
| 分支B | 同上 | 250-350 | 同上 |
| 分支C | 同上 | 250-350 | 同上 |
| 分支D | 同上 | 250-350 | 同上 |
| 隐藏链 | 全分支通关后 | 20-50 | Branch=hidden，独立时间轴 |

各分支 story 按 MinSeconds 升序分布（20 分钟/段节奏）。

### Flag 系统

FlagSet（设旗标）和 FlagRequire（检查旗标）控制剧情分支和结局触发：

- **FlagSet**：事件触发时设置，语法 `键名=值`（等于）、`键名+=数值`（累加）、`键名-=数值`（递减）、裸键名（设为 true）
- **FlagRequire**：事件触发前检查，语法 `键名=值`（等于）、`键名>=5`（数值大于），支持 >、>=、<、<=、==
- 多个条件：`;` 或 `&`（所有条件满足）或 `|`（任一条件满足）；裸键名 = 该 flag 存在即满足
- 值统一按字符串比较（`saved_x=false` 与设置的 `'false'` 匹配）

示例：
```
FlagSet: helped_merchant=true;reputation+=5
FlagRequire: helped_merchant=true&reputation>20
```

### 结局

- 分支结局 = **CompletionTitle 列有值的事件**，读完该段即触发通关（通关记录/通关称号/旅程完成面板）
- 结局事件必须位于分支链末尾（MinSeconds 最大）——validate_quality 会校验
- 不同结局可解锁不同通关称号（通过 CompletionTitle 列）
- 每通关一条分支，该分支标记为已完成；全分支通关 → 隐藏链激活
- **兜底规则：每个分支最后必须有一个无条件结局（FlagRequire 留空）**，防止玩家 flag 组合落空时看不到结局

### 叙事节奏

**MinSeconds 是容量，节奏由内容决定。** 不硬套固定分段，只守三条硬约束：
1. 故事从共享开篇（MinSeconds 0）开始铺垫
2. 分支结局是终章——最后 ~30-50 段留给"高潮→收尾→结局"
3. choice 均匀分布（章节衔接处放抉择）

模板参考（可自由改，时间轴按 20 分钟/段换算）：

| 模板 | 分段 | 适合 |
|------|------|------|
| 五段式 | 开端0-2h/成长2-17h/鼎盛17-33h/沉淀33-50h/终章50-58h | 人生传记类 |
| 三幕式 | 建立0-17h/对抗17-42h/收尾42-58h（比例可调） | 冒险/战争类 |
| 慢热式 | 长铺垫0-25h/展开25-52h/收尾52-58h | 悬疑/日常类 |

## Achievements 成就表

| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| ID | 是 | `{id}_a{三位编号}` | wasteland_a001 |
| Name | 是 | 成就名称 | 初踏废土 |
| Description | 是 | 成就描述 | 到达 5 级 |
| Icon | 否 | 显示图标，默认 ★ | ★ |
| ConditionType | 是 | 条件类型：level / runtime / events / titles | level |
| ConditionValue | 是 | 条件数值（runtime 单位为毫秒） | 5 |

**建议：50 个。** 四种 ConditionType 分布参考：level 13 个、runtime 12 个、events 12 个、titles 13 个。

### 条件类型

| 类型 | 说明 | ConditionValue 示例 |
|:----|:-----|:-------------------|
| `level` | 达到指定**宠物等级** | 10、50、200 |
| `runtime` | 挂机时长（毫秒） | 3600000（1h）、86400000（24h） |
| `events` | 触发过 N 个不同事件 | 10、50 |
| `titles` | 解锁 N 个称号 | 5、15 |

## HolidayEvents 节日事件表

**v4 已取消**（节日事件系统删除，转宠物语节日台词池——见 electron/pet-lines.cjs holiday 段，按节日 id 分组）。

## 注意事项（build.js 校验易翻车点）

- frontmatter 第一行必须是 `---`，前面不能有 BOM
- Events 表内部不能有任何空行（空行会导致 parseTable 提前终止）
- 每行 pipe table 必须以 `|` 开头和结尾，末尾缺 `|` 会解析失败
- 每行 pipe 列数必须为 20 列
- 事件文本不少于 10 字
- ChoiceTarget 的 ID 必须在副本内存在
- **MinSeconds 按 20 分钟/段节奏递增**（1200 秒）；choice target 为 0
- **结局事件（CompletionTitle）必须在分支链末尾**；隐藏链（Branch=hidden）事件独立连续
- runtime 类型 ConditionValue 单位为**毫秒**
- 节与节之间（## Titles / ## Events 等）可以有**空行**，Events 表内部不能有

## 构建说明

内置副本放在 `scenarios/` 目录下，运行 `node build.js` 解析全部 `.md` 文件输出到 `public/scenarios_data.json`。

玩家自制副本放在 `scenarios_user/` 目录下，游戏启动时自动解析。

## 完整示例

见 `docs/example-hello-world.md`。使用 ScenarioWriter skill（AI）生成请参考 `ai/ScenarioWriter/SKILL.md`。
