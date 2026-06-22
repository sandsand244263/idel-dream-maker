# 副本 .md 格式规范

副本文件是 Markdown 格式，包含 YAML frontmatter 和多个 pipe table 章节。

## Frontmatter

文件开头用 `---` 包裹的 YAML 元数据：

```yaml
---
id: wasteland              # 副本唯一 ID（小写字母 + 数字 + 下划线）
name: Wasteland            # 英文名称
name_cn: 废土              # 中文名称
description: 核战后的废土世界...  # 副本描述（一句话）
player_title: 拾荒者        # 玩家初始称号
language: zh               # 语言（固定 zh）
mechanic: standard         # 挂机机制：standard / cultivation / cyber / tide / polar
max_rebirth: 3             # 最大重生次数（0 = 不可重生）
unlock_requirement:        # 解锁条件
  hub_level: 0             # 需要大厅等级
  completions: 0           # 需要通关副本数
completion_title: 灰烬新生  # 通关称号（通关后获得）
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

## Titles 称号表

| 列名 | 说明 | 示例 |
|------|------|------|
| Level | 解锁等级（1-500） | 1 |
| Name | 称号名称 | 拾荒者 |
| Color | 显示颜色（十六进制） | #888888 |
| Description | 称号描述 | 你在废墟中翻找食物残渣 |

至少 5 个称号，按等级升序排列。建议 30 个。

## Events 事件表

| 列名 | 必填 | 说明 |
|------|------|------|
| ID | 是 | 唯一 ID（每副本内唯一） |
| Type | 是 | `story`（剧情）或 `filler`（日常） |
| MinLevel | 否 | 最低触发等级，默认 1 |
| MinHours | 否 | 最低挂机小时数，默认 0 |
| Weight | 否 | 触发权重 1-10，默认 5 |
| Once | 否 | 是否只触发一次：yes/no |
| MinRebirth | 否 | 最低重生次数（0 = 初始周目），默认 0 |
| Text | 是 | 事件文本 |

### 事件类型

- **story**：升级时触发，与等级提示合并显示为 "Lv.X — 事件文本"，推动剧情
- **filler**：时间驱动（每挂机 1 小时触发 1 条，每天上限动态计算），日常见闻

### Filler 密度

filler 数量 = floor(升到该级所需秒数 / 3600)，约每 60 分钟配 1 条。

### 多周目

用 MinRebirth 列区分周目：
- MinRebirth=0：初始周目 story ~500 条
- MinRebirth=1：二周目 story ~500 条
- 以此类推

每个周目的 filler 独立编写，约 1700 条/周目。

## Achievements 成就表

| 列名 | 必填 | 说明 |
|------|------|------|
| ID | 是 | 唯一 ID |
| Name | 是 | 成就名称 |
| Description | 是 | 成就描述 |
| Icon | 否 | 显示图标，默认 ★ |
| ConditionType | 是 | 条件类型：level / runtime / events / titles |
| ConditionValue | 是 | 条件数值 |
| MinRebirth | 否 | 最低重生次数，默认 0 |

### 条件类型

- `level`：等级达到 ConditionValue
- `runtime`：挂机时长达到 ConditionValue 毫秒
- `events`：收集事件数达到 ConditionValue
- `titles`：解锁称号数达到 ConditionValue

## HolidayEvents 节日事件表

| 列名 | 必填 | 说明 |
|------|------|------|
| ID | 是 | 唯一 ID |
| HolidayID | 是 | 节日 ID（见 holiday.cjs 定义） |
| Type | 否 | `day`（当天触发）或 `advance`（节前 3 天触发），默认 day |
| MinLevel | 否 | 最低等级，默认 1 |
| MinHours | 否 | 最低小时数，默认 0 |
| Weight | 否 | 权重 1-10，默认 5 |
| Once | 否 | 是否只触发一次，默认 no |
| Text | 是 | 事件文本 |

## 完整最小示例

见 `docs/example-hello-world.md`。

## 构建说明

内置副本放在 `scenarios/` 目录下，运行 `node build.js` 会解析全部 `.md` 文件输出到 `public/scenarios_data.json`。

玩家自制副本放在 `scenarios_user/` 目录下，游戏启动时自动解析。
