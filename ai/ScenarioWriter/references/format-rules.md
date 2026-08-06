> **v3 存档**（MinLevel/500级/节日事件时代）。v4 新副本请用项目根目录 `docs/format-rules.md`（MinSeconds/旅程进度称号/隐藏链/结局规则）。本文件仅作历史参考。

# ScenarioWriter 副本格式规则

本文件定义 .md 副本文件的核心格式规范，同时被 SKILL.md 和验证脚本引用。

## Frontmatter 字段

```yaml
---
id: wasteland           # 必填。小写字母/数字/下划线
name: Wasteland         # 必填。英文名
name_cn: 废土           # 必填。中文名
description: 核战后的废土世界...  # 必填。世界观描述
player_title: 拾荒者    # 必填。Lv.1 默认称号
language: zh            # 可选（当前引擎未使用，统一写 zh）
mechanic: standard      # 可选。挂机变体：standard/cultivation/cyber/tide/polar，默认 standard
max_rebirth: 0          # 可选。最大重生次数 0-3，默认 0（单周目）
branches: [survivor, merchant, fugitive, ai]  # 必填。分支列表（validate_quality.cjs 依赖它做分支等级覆盖检查）
unlock_requirement:      # 可选。解锁条件，默认全 0（默认解锁）
  hub_level: 0          # 大厅等级要求
  completions: 0        # 任意副本通关次数要求
completion_title: 废土行者  # 可选。通关解锁的大厅称号
---
```

## Titles 表规则

| 列 | 必填 | 类型 | 说明 |
|----|------|------|------|
| Level | 是 | 整数 | 解锁等级，必须升序 |
| Name | 是 | 字符串 | 称号名称 |
| Color | 是 | 字符串 | 十六进制含 `#` |
| Description | 是 | 字符串 | 称号描述 |

要求：**30 个**，Level 严格升序。称号跨周目共用，不区分周目。
> 数量为内容要求，无脚本强制（写少不会被拦截，只影响体验）——build 只校验升序与非空。

## Events 表规则（20 列标准）

> 标准为 **20 列**（与废土实际文件、merge.cjs 表头一致）。多周目副本如需 MinRebirth 列，在 Once 后插入（共 21 列），build 与引擎均支持。

**完整表头（照抄，每行必须 20 列，以 | 开头和结尾）：**

```
| ID | Type | MinLevel | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| {id}_e0001 | story | 1 | 0 | 1 | 是 | | | | | | | | | | | | | 觉醒 | 30-80字的故事文本 |
```

| 列 | 必填 | 类型 | 说明 |
|----|------|------|------|
| ID | 是 | 字符串 | `{id}_e{四位编号}`，choice target 用 `e{编号}a` / `e{编号}b` / `e{编号}c` / `e{编号}d` |
| Type | 是 | 枚举 | `story`（剧情节点，升级时触发）。**无 filler 类型（机制已废弃）** |
| MinLevel | 否，默认 1 | 整数 | 对应等级编号 1-500 |
| MinHours | 否，默认 0 | 整数 | **引擎不消费此列，固定写 0** |
| Weight | 否 | 整数 | **固定写 1**（留空时 parser 取默认 5；引擎不消费，build 校验范围 1-10） |
| Once | 否 | 是/否 | **必须显式写 是**！留空 = 可重复触发（事件每次升级反复弹出，还会挤掉后续事件） |
| Branch | 否 | 字符串 | 分支归属（survivor/merchant/...）。空=共享事件（仅开局 Lv.1-5 使用） |
| FlagSet | 否 | 字符串 | 触发时设旗标。多个用 `;` 分隔 |
| FlagRequire | 否 | 字符串 | 触发条件。`;`/`&` 都是 AND，`|` 是 OR |
| CompletionTitle | 否 | 字符串 | 结局事件的专属通关称号 |
| Choice1~Choice4 | 否 | 字符串 | 选项按钮文字（10 字以内），有值则本条为 choice 事件 |
| Choice1Target~Choice4Target | 否 | 字符串 | 选该选项后触发的事件 ID，必须存在 |
| Action | 否 | 字符串 | 核心动作关键词（如"翻找"、"修水管"），记录便于人工审查多样性（无脚本校验） |
| Text | 是 | 字符串 | 30-80 字 |

### 选择事件（choice）

choice 事件 = 在 story 事件上加 Choice1/Choice1Target 等列，让玩家在关键节点做选择。

**规则：**
- Choice1 有值 → 本条视为 choice 事件，气泡显示对应数量按钮（2-4 个）
- Choice1Target 指向目标事件 ID，目标事件必须是同一副本内的 story 事件（不加 Choice 列）
- 目标事件 ID 用 `{编号}a` / `{编号}b` / `{编号}c` / `{编号}d`，插入在 choice 事件等级之后
- 推荐每分支 10-15 个 choice，均匀分布在 500 级中（口径：**周目 = 一条分支路径**，玩家一次通关 = 走一条分支）

**choice 三层设计（先定层再写）：**

| 层 | 机制 | FlagSet 写法 | FlagRequire 写法 |
|----|------|-------------|-----------------|
| 态度选择 | 数值 flag（0-100） | `attitude_xxx+=10` / `attitude_xxx-=10` | `attitude_xxx>=60`（文本变体） |
| 路径选择 | branch 切换 / a-b 平行线 | （可无） | 走 15 级平行线后汇合 |
| 命运选择 | 关键 flag | `saved_xxx=true` | 决定 Lv500 结局归属 |

**例：**
```
| ID | Type | MinLevel | ... | Branch | FlagSet | FlagRequire | Choice1 | Choice1Target | Choice2 | Choice2Target | Text |
| w_e0050 | story | 50 | ... | | | | 走大道 | w_e0051a | 穿密林 | w_e0051b | 你站在岔路口... |
| w_e0051a | story | 51 | ... | | route_highway=true | | | | | | 你走上大道，遇到商队... |
| w_e0051b | story | 51 | ... | | route_forest=true | | | | | | 你钻入密林，踩到捕兽夹... |
```

### 数值 flag（态度值）规范

适合表示理性、好感、勇气等**连续心理状态**，影响同分支内文本变体（不切分支、不决定结局）。

- 命名：`attitude_*`，如 `attitude_kind`、`attitude_trust`
- 范围：0-100（引擎不强制校验，靠写作规范约束）
- 设置：`attitude_kind+=10`（累加）/ `attitude_kind=40`（直接赋值）
- 判断：`attitude_kind>=60` / `attitude_kind<=30`
- 用途：NPC 态度细节、旁支信息可见性、同一结局的语气变体
- 禁止：不用态度值做结局主判定（结局由命运 flag 决定，态度值只做辅助）

### flag 系统完整语义（v3.7.9 起）

- **FlagSet**（设置）：多个用 `;` 分隔；`key=value`、`key+=n`、`key-=n`；裸 flag 名 = 设为 true
- **FlagRequire**（判断）：`;` 与 `&` 都是 AND，`|` 是 OR；**裸 flag 名 = 存在即 true**；值统一字符串比较（`saved_x=false` 与设置的 `'false'` 匹配）；运算符支持 `>=` `<=` `==` `=` `>` `<`
- 示例：`FlagRequire: saved_ahqiang=false; fed_wangcai=1`（未救阿强 且 喂过狗）

### 事件类型

| 类型 | 数量（每分支） | 触发方式 | 内容风格 |
|:----|:----:|:---------|:---------|
| `story`（普通） | ~500/分支 × (1 + max_rebirth) 周目 | 升级时触发，与等级提示合并 | 剧情主线，推动人生叙事 |
| `story`（choice） | 10-15/分支 × (1 + max_rebirth) 周目 | 升级时触发，带 2-4 个选项按钮 | 关键转折点，玩家选择决定后续走向 |
| `choice target` | 20-45/分支 × (1 + max_rebirth) 周目 | 由玩家选择后立即弹出 | 选择后的分支叙事 |

### story 节奏分段规范

**等级是容量，节奏由内容决定。** 不硬套固定分段，只守三条硬约束：
1. 故事从 Lv.1 开始铺垫
2. Lv.500 是结局——最后一段（约 30-50 级）留给"高潮→收尾→结局"
3. choice 均匀分布

模板参考（可自由改）：

| 模板 | 分段 | 适合 |
|------|------|------|
| 五段式 | 开端1-50/成长51-150/鼎盛151-300/沉淀301-450/终章451-500 | 人生传记类 |
| 三幕式 | 建立1-150/对抗151-350/收尾351-500（比例可调） | 冒险/战争类 |
| 慢热式 | 长铺垫1-200/展开201-430/收尾431-500 | 悬疑/日常类 |

各周目 story 均为 500 条、从头到尾逐级推进，只是故事内容不同。

### 结局文本与结局规划表

**Lv.500 自动触发结局检测。** 引擎按"当前分支内最后一个满足 FlagRequire 条件的 story 事件"选结局，无条件时取分支内最后事件。

**结局规划表（规划阶段必做，新副本强制）：**

```
分支名：survivor
  主结局（无条件兜底）    : e0500「灰烬新生」— 放置在本分支最后一行，FlagRequire 留空
  条件结局 1              : e0499「孤独之路」— FlagRequire: saved_ahqiang=false; fed_wangcai=1
  条件结局 2              : e0498「塔顶」     — FlagRequire: went_to_tower=true
  ...
```

**两条硬规则：**
1. **每个分支最后一行必须是无条件结局**（FlagRequire 留空，且**必须是普通 story 事件——不带 Choice 列**，否则引擎会把它当 choice 事件处理）——防止玩家 flag 组合落空时看到条件不成立的结局文本
2. 条件结局事件按 flag 组合规划，文本必须与条件对应（"没救阿强"的结局不能写"你救下了他"）

各周目的最后一条 story（LV500，对应 MinRebirth）类似处理；仅 MinRebirth=0 的结局有特殊弹窗。

### 质量规则（内容层面）

1. **角色弧**：每个核心配角必须有"出场→变化→结局"三点，不允许出场一次后消失
2. **伏笔-回收**：伏笔 flag 命名 `foreshadow_*`，必须同路径可回收；**埋点（FlagSet foreshadow_*）必须放在必然触发的事件上，不得放在 choice target 或条件分支的旁路**（玩家可能选不到）。**脚本局限**：validate_quality.cjs 只查"伏笔 flag 被任意事件的 FlagRequire 引用"（不分分支、不分先后），同路径与埋点位置靠 AI 自检清单 + 精校轮通读约束
3. **世界展开**：每 100 级至少引入 1 个新地点或新社会群体（防止原地打转）
4. **承接**：每批开头必须承接上批段尾悬念
5. **文本多样性**：连续事件避免同句式开头；Action 列记录动作关键词（人工审查用）

## HolidayEvents 表规则（7 列）

| 列 | 必填 | 类型 | 说明 |
|----|------|------|------|
| HolidayID | 是 | 字符串 | 对应 `electron/holiday.cjs` 中的节日 ID（写错无校验，事件将永不触发且无报错） |
| Type | 是 | 枚举 | `advance`（节前 3 天）或 `day`（节日当天） |
| MinLevel | 否，默认 1 | 整数 | **引擎忽略此列，统一写 1** |
| MinHours | 否，默认 0 | 整数 | **引擎忽略此列，统一写 0** |
| Weight | 否 | 整数 | **引擎忽略此列，统一写 1** |
| Once | 否 | 是/否 | **引擎忽略此列，统一写 是**（去重靠节日 key，与 Once 列无关） |
| Text | 是 | 字符串 | 30-80 字 |

> 引擎按 holidayId+type 随机选一条节日事件，MinLevel/MinHours/Weight/Once 四列不消费——不要填写其他值（写了也不生效）。

每个节日需要 2 条事件（1 条 advance + 1 条 day），共 26 个节日 52 条。
节日事件跨周目共用（MinRebirth=0）。

节日列表（26 个）：
- 固定日期（14）：new_year, valentine, women_day, white_day, april_fools, earth_day, labor_day, childrens_day, environment_day, peace_day, halloween, christmas_eve, christmas, new_year_eve
- 农历节日（7）：spring_festival, lantern_festival, dragon_boat, qixi, zhongyuan, mid_autumn, double_ninth
- 浮动节日（5）：qingming（清明节气）, easter（复活节）, mothers_day, fathers_day, thanksgiving

## Achievements 表规则（6 列标准）

| 列 | 必填 | 类型 | 说明 |
|----|------|------|------|
| ID | 是 | 字符串 | `{id}_a{三位编号}` |
| Name | 是 | 字符串 | 成就名称 |
| Description | 是 | 字符串 | 成就描述 |
| Icon | 否，默认 ★ | 字符串 | 单字符图标 |
| ConditionType | 是 | 枚举 | level/runtime/events/titles |
| ConditionValue | 是 | 数值 | 见下方"条件值与单位" |

> 标准 **6 列**（与废土实际一致）。多周目副本如需按周目区分成就，可追加 `MinRebirth` 列（parser 支持，引擎当前不按此过滤）。

要求：**50 个**，四种 ConditionType 严格按以下数量分布：
- level: **13** 个
- runtime: **12** 个（值必须为毫秒）
- events: **12** 个
- titles: **13** 个

> 数量为内容要求，无脚本强制（build 只校验条件类型合法与值上限）。

### 条件值与单位

| ConditionType | ConditionValue | 说明 |
|:---|:---|:---|
| `level` | 等级编号，如 5、50、200 | 达到指定等级时解锁 |
| `runtime` | **毫秒值** | 示例：`3600000`=1小时，`86400000`=24小时 |
| `events` | 事件数，如 10、50 | 触发过 N 个不同事件时解锁 |
| `titles` | 称号数，如 5、15 | 解锁 N 个称号时解锁 |

> 注意：parser 不支持成就表的 FlagRequire 列，**不要写该列**（写了会被忽略）。

## 常见校验失败

- 事件 ID 重复（ID 检查）
- Title Level 未升序（升序检查）
- 事件文本 < 10 字（长度检查）
- weight 不在 1-10 范围内（范围检查）
- Frontmatter 缺少必填字段（字段检查）
- HolidayEvents 缺少 Type 列
- Events 缺少 Type 列
- Events Type 值不是 story（filler 已废弃，写了报错或无效）
- runtime 类型的 ConditionValue 不是毫秒值
- choice target 悬空（build 阶段直接报错中断，非 WARN）
- 分支等级缺口（validate_quality.cjs 检查：每分支 1-500 每级至少 1 事件）
- 伏笔未回收（validate_quality.cjs 检查：foreshadow_* flag 必须被后续引用）
- 表内空行是**静默截断**（不报错，空行后的数据全部丢失，事后表现为等级缺口/数量不足，难排查）
