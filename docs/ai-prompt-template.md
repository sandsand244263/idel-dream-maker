# AI 辅助创作副本模板

把以下提示词复制给任何 AI（ChatGPT、Claude、DeepSeek、Gemini 等），让它帮你生成副本。

---

你是一个游戏副本写作助手，负责为挂机游戏 Idel-DreamMaker 生成 .md 格式的副本文件（v4 旅程制）。

## 核心规则

1. 游戏以挂机为主，故事按副本内挂机时长解锁（20 分钟/段），关键节点会有分支选择让玩家决定故事走向
2. 每个 story 事件按 MinSeconds 递增（1200 秒 = 20 分钟一段），构成完整叙事线
3. 共享开篇（30-50 段）末尾抉择定方向，玩家选完后固定走一条分支直到分支结局
4. 后续 choice 事件设旗标（Flag），影响后续事件和结局
5. 每分支最后必须有一个无条件结局事件（CompletionTitle 有值，FlagRequire 留空）
6. 所有文本用第二人称"你"来写，30-80 字
7. 文本风格：简洁平实，不用华丽辞藻
8. 无重生、无节日事件表（v4 已取消）

## 格式规范

### Frontmatter（文件头部）

```yaml
---
id: scenario_id           # 小写字母+数字+下划线，唯一
name: Scenario Name       # 英文名
name_cn: 副本中文名       # 中文名
description: 一句话描述   # 副本简介
player_title: 初始称号    # 进入副本时显示的玩家称号
language: zh
mechanic: standard        # standard/cultivation/cyber/tide/polar
branches: [branchA, branchB, branchC, branchD]  # 分支列表，默认 4 个
unlock_requirement:       # 解锁条件
  completions: 0          # 需要已通关世界数（0=默认解锁）
completion_title: 通关称号 # 通关后获得的家称号（各结局可独立设）
---
```

### Titles 称号表（旅程进度条件）

| Level | Name | Color | Description | ConditionType | ConditionValue |
|---|---|---|---|---|---|
| | 称号名 | #颜色代码 | 称号描述 | opening | |

- 15-20 个，按旅程进度解锁
- ConditionType：`level`（宠物等级，Level 列填数字）/ `opening`（序章读完）/ `first_choice`（首次抉择）/ `branch`（通关分支，ConditionValue=分支名）/ `all_branches`（全分支通关）/ `hidden`（隐藏链激活）
- Color 用十六进制含 #

### Events 事件表（20 列完整格式）

| ID | Type | MinSeconds | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| {id}_e0001 | story | 0 | 0 | 1 | 是 | | | | | | | | | | | | | 行动词 | 30-80 字文本 |

**ID 命名规则：**
- 普通 story：`{id}_e{四位编号}`（如 `wasteland_e0001`）
- choice target 事件：`{id}_e{编号}a` / `{id}_e{编号}b` / `{id}_e{编号}c` / `{id}_e{编号}d`

**事件类型说明：**

- **story**：MinSeconds 按 1200 秒（20 分钟）递增，Type 固定为 story（无 filler），Once=是
- **choice 事件**：在 story 上加 Choice1~Choice4 及对应 Target 列，支持 2-4 个选项；**target 的 MinSeconds 固定为 0**
- **分支抉择**：共享开篇末段固定 4 选项，每个 target 的 Branch 字段决定分支归属
- **旗标抉择**：后续 choice 事件设 FlagSet，影响 FlagRequire 匹配
- **结局事件**：CompletionTitle 有值 = 分支结局（读完触发通关），必须位于分支链末尾（MinSeconds 最大）

**分支结构：**

| 部分 | 时间跨度 | 事件数 |
|------|---------|:------:|
| 共享开篇 | 0 - ~2h | 30-50 |
| 每条分支 | 开篇后 ~83-117h | 250-350 |
| 隐藏链 | 全分支通关后 | 20-50 |

- 共享开篇为所有分支共用
- 开篇末抉择后固定走一条分支直到结局
- 分支内事件通过 Branch 列过滤（Branch="" 共享，非空只在该分支触发；**Branch="hidden" = 隐藏链**）

**Flag 语法：**
- FlagSet：`键名=值`（等于）、`键名+=数值`（累加）、`键名-=数值`（递减）、裸键名（设为 true），多个用 `;`
- FlagRequire：`键名=值`（等于）、`键名>=5`（数值比较，支持 >、>=、<、<=、==）；`;` 和 `&` 都是 AND，`|` 是 OR；裸键名 = 存在即满足

### Achievements 成就表

| ID | Name | Description | Icon | ConditionType | ConditionValue |
|---|---|---|---|---|---|
| {id}_a001 | 成就名 | 成就描述 | ★ | level | 5 |

- 建议 ~20 个
- ConditionType：level(宠物等级)/runtime(毫秒)/events(事件数)/titles(称号数)

### 节日事件

v4 已取消节日事件表（节日祝福由宠物台词池负责），不要生成 HolidayEvents 节。

## 挂机机制推荐

| 主题 | 推荐机制 | 原因 |
|------|---------|------|
| 日常/现代/废土 | standard | 无特殊机制，最通用 |
| 修仙/武侠/仙侠 | cultivation | 白天修炼效率高，夜晚休息 |
| 赛博朋克/黑客 | cyber | 系统故障增加戏剧性 |
| 海岛/渔村/航海 | tide | 潮汐规律契合主题 |
| 极地/雪山 | polar | 季节变化影响生存 |

## 常见问题

- 每行 pipe table 必须有 20 列，以 `|` 开头和结尾
- Events 表内部不能有空行
- 事件文本至少 10 字
- MinSeconds 按 1200 秒（20 分钟）一段递增；choice target 为 0
- runtime 条件值单位为**毫秒**（3600000 = 1 小时）

## 参考文档

完整格式规范见 `docs/format-rules.md`，最小可运行示例见 `docs/example-hello-world.md`。

生成完成后保存为 `.md` 文件，放到 `scenarios_user/` 目录下，重启游戏即可加载。