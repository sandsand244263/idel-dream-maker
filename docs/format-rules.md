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
branches: [scavenger, merchant, soldier, ai]  # 分支列表，每个分支名用英文
unlock_requirement:         # 解锁条件
  hub_level: 0              # 需要大厅等级
  completions: 0            # 需要通关副本数
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

定义副本有哪些分支路线。玩家 Lv.5 时通过 4 选项抉择选择其中一条，之后固定走该分支直到 Lv.500。

每个分支拥有独立的 ~500 级 story 事件。分支间的事件通过 Branch 列过滤。

## Titles 称号表

| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| Level | 是 | 解锁等级（1-500） | 1 |
| Name | 是 | 称号名称 | 拾荒者 |
| Color | 是 | 十六进制颜色（含 #） | #888888 |
| Description | 是 | 称号描述 | 你在废墟中翻找食物残渣 |

**要求：30 个，等级严格升序。** 称号跨分支共用，不区分分支。

## Events 事件表

20 列完整格式。每行 pipe table 以 `|` 开头和结尾，共 20 列：

| ID | Type | MinLevel | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| {id}_e0001 | story | 1 | 0 | 1 | 是 | | | | | | | | | | | | | 觉醒 | 30-80字的故事文本 |

### 列说明

| 列名 | 必填 | 类型 | 说明 |
|------|------|------|------|
| ID | 是 | 字符串 | `{id}_e{四位编号}`。choice target 用 `e{编号}a` / `e{编号}b` / `e{编号}c` / `e{编号}d` |
| Type | 是 | 枚举 | 固定为 `story`（v3.4.0 起只有 story，无 filler） |
| MinLevel | 否 | 整数 | 触发等级（1-500），每条 story 对应一级，逐级递增 |
| MinHours | 否 | 整数 | 固定为 0 |
| Weight | 否 | 整数 | 固定为 1 |
| Once | 否 | 是/否 | 全部为 是 |
| Branch | 否 | 字符串 | 分支归属。空=共享事件，非空=只在该分支触发（如 `merchant`） |
| FlagSet | 否 | 字符串 | 触发时设旗标，如 `helped_merchant=true` 或 `reputation+=5`。多个用 `;` 分隔 |
| FlagRequire | 否 | 字符串 | 触发条件，如 `helped_merchant=true`。`&`=AND，`\|`=OR。支持 >、>=、<、<=、== |
| CompletionTitle | 否 | 字符串 | 结局事件的专属通关称号，触发时自动解锁 |
| Choice1~Choice4 | 否 | 字符串 | 选项按钮文字（10 字以内）。有值则本条为 choice 事件 |
| Choice1Target~Choice4Target | 否 | 字符串 | 选该选项后触发的事件 ID，必须存在 |
| Action | 否 | 字符串 | 核心动作关键词（如"翻找"、"修水管"），用于校验文本多样性 |
| Text | 是 | 字符串 | 30-80 字的故事文本 |

### 事件类型

| 类型 | 数量 | 触发方式 | 说明 |
|:----|:----:|:---------|:-----|
| `story` | ~500/分支 | 升级时触发 | 推动剧情主线 |
| `story`（choice） | 10-15/分支 | 升级时触发，带 2-4 个按钮 | 分支走向或旗标设定，文本通常较短（30 字左右） |
| `choice target` | 20-30/分支 | 由玩家选择后立即弹出 | 选择后的叙事 |

### choice 事件规则

choice 事件 = 在 story 事件上加 Choice1~Choice4 及对应 Target 列。支持 2-4 个选项。

- Choice1 有值 → 本条视为 choice 事件，气泡显示对应数量按钮
- Target 指向的目标事件必须是同一副本内的 story 事件（不加 Choice 列）
- Target 事件 ID 用 `{编号}a` / `{编号}b` / `{编号}c` / `{编号}d`，插入在 choice 事件等级之后
- Lv.5 固定为分支抉择：4 个选项，每个 target 的 Branch 字段决定分支归属

### 分支结构

| 部分 | 等级 | 事件数 | 说明 |
|------|------|:------:|------|
| 共享开头 | Lv.1-4 | 4 | 所有分支共用 |
| 分支A | Lv.5-500 | ~500 | 玩家选择后固定走此分支 |
| 分支B | Lv.5-500 | ~500 | 同上 |
| 分支C | Lv.5-500 | ~500 | 同上 |
| 分支D | Lv.5-500 | ~500 | 同上 |

各分支 story 逐级分布（Lv.5→500 各一条，即 496 条/分支）。

### Flag 系统

FlagSet（设旗标）和 FlagRequire（检查旗标）控制剧情分支和结局触发：

- **FlagSet**：事件触发时设置，语法 `键名=值`（等于）、`键名+=数值`（累加）、`键名-=数值`（递减）
- **FlagRequire**：事件触发前检查，语法 `键名=值`（等于）、`键名>5`（数值大于）、`键名>=5`、`键名<5`、`键名<=5`
- 多个条件用 `&`（所有条件满足）或 `|`（任一条件满足）

示例：
```
FlagSet: helped_merchant=true;reputation+=5
FlagRequire: helped_merchant=true&reputation>20
```

### 结局

- Lv.500 自动触发结局检测
- 引擎找当前分支内最后一个满足 FlagRequire 条件的 story 作结局
- 不同结局可解锁不同通关称号（通过 CompletionTitle 列）
- 每通关一条分支，该分支标记为已完成

### 叙事节奏

| 阶段 | 等级 | story 数 | 叙事风格 |
|------|------|:-------:|---------|
| 开端 | 1-50 | 50 | 初始世界、初遇挑战 |
| 成长 | 51-150 | 100 | 结交盟友、确立目标 |
| 鼎盛 | 151-300 | 150 | 应对大敌、建功立业 |
| 沉淀 | 301-450 | 150 | 培养后辈、准备谢幕 |
| 终章 | 451-500 | 50 | 完成最后之事、坦然离去 |

## Achievements 成就表

| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| ID | 是 | `{id}_a{三位编号}` | wasteland_a001 |
| Name | 是 | 成就名称 | 初踏废土 |
| Description | 是 | 成就描述 | 到达 5 级 |
| Icon | 否 | 显示图标，默认 ★ | ★ |
| ConditionType | 是 | 条件类型：level / runtime / events / titles | level |
| ConditionValue | 是 | 条件数值（runtime 单位为毫秒） | 5 |
| FlagRequire | 否 | 触发条件，不填则全局可解锁 | branch=merchant |

**建议：50 个。** 四种 ConditionType 分布参考：level 13 个、runtime 12 个、events 12 个、titles 13 个。

### 条件类型

| 类型 | 说明 | ConditionValue 示例 |
|:----|:-----|:-------------------|
| `level` | 达到指定等级 | 10、50、200 |
| `runtime` | 挂机时长（毫秒） | 3600000（1h）、86400000（24h） |
| `events` | 触发过 N 个不同事件 | 10、50 |
| `titles` | 解锁 N 个称号 | 5、15 |

## HolidayEvents 节日事件表

| 列名 | 必填 | 说明 |
|------|------|------|
| ID | 是 | `{id}_h{三位编号}` |
| HolidayID | 是 | 节日 ID（见下方列表） |
| Type | 是 | `day`（当天触发）或 `advance`（节前 3 天触发） |
| MinLevel | 否 | 最低等级，默认 1 |
| MinHours | 否 | 最低小时数，默认 0 |
| Weight | 否 | 固定为 1 |
| Once | 否 | 固定为 是 |
| Text | 是 | 30-80 字事件文本 |

**要求：26 个节日，每个节日 2 条（1 条 advance + 1 条 day），共 52 条。**

### 节日列表

固定日期：new_year, valentine, women_day, white_day, april_fools, earth_day, labor_day, childrens_day, environment_day, peace_day, halloween, christmas_eve, christmas, new_year_eve

农历节日：spring_festival, lantern_festival, dragon_boat, qixi, zhongyuan, mid_autumn, double_ninth

浮动节日：qingming（清明节气）, easter（复活节）, mothers_day, fathers_day, thanksgiving

## 注意事项（build.js 校验易翻车点）

- frontmatter 第一行必须是 `---`，前面不能有 BOM
- Events 表内部不能有任何空行（空行会导致 parseTable 提前终止）
- 每行 pipe table 必须以 `|` 开头和结尾，末尾缺 `|` 会解析失败
- 每行 pipe 列数必须为 20 列
- 事件文本不少于 10 字
- ChoiceTarget 的 ID 必须在副本内存在
- runtime 类型 ConditionValue 单位为**毫秒**
- 节与节之间（## Titles / ## Events 等）可以有**空行**，Events 表内部不能有

## 构建说明

内置副本放在 `scenarios/` 目录下，运行 `node build.js` 解析全部 `.md` 文件输出到 `public/scenarios_data.json`。

玩家自制副本放在 `scenarios_user/` 目录下，游戏启动时自动解析。

## 完整示例

见 `docs/example-hello-world.md`。使用 ScenarioWriter skill（AI）生成请参考 `skills/ScenarioWriter/SKILL.md`。
