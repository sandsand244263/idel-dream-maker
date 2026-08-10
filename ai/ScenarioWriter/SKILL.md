---
name: ScenarioWriter
description: 为 Idel-DreamMaker 生成带分支选择的副本(.md格式)。三种模式：原创构思、导入小说改编、跨会话续写。旅程制叙事：共享开篇+分支链+隐藏链，按挂机时长(20分钟/段)解锁。
when_to_use: 当用户想「写一个副本」「创建新剧情」「生成人生故事」「做一个有分支的剧本」「把小说做成游戏」「继续上次的副本」时。
when_not_to_use: 不要用于审核已有副本、修改现有副本文本、删除数据、调试游戏引擎。
allowed-tools: Glob, Read, Write, Edit, Bash
---

# ScenarioWriter — Idel-DreamMaker 旅程副本生成（v4）

## 这是什么

为挂机游戏 Idel-DreamMaker 创作副本（旅程）。每个副本 = 一次完整的旅程：**共享开篇 → 分支抉择 → 分支链 → 结局**，按副本内挂机时长解锁（20 分钟/段），全分支通关后解锁隐藏链。关键节点做选择，影响后续剧情走向。

**三种模式（进入时先问用户选哪种）：**

| 模式 | 触发 | 说明 |
|------|------|------|
| **原创模式** | 用户没有素材，从零构思 | 先聊设定 → 规划 → 小批生成 |
| **改编模式** | 用户提供小说/剧本/大纲 | 走改编指南（references/adaptation-guide.md） |
| **续写模式** | 上次生成中断/要跨会话继续 | 读状态文件从断点续写，见"跨会话"章节 |

## 数据规格（v4）

| 项目 | 值 |
|------|-----|
| 共享开篇 | 30-50 段（序章 + 首个分支抉择，MinSeconds 0 起） |
| 每条分支 | 250-350 段（含分支内抉择与结局） |
| 隐藏链 | 20-50 段（Branch=hidden，**全分支通关后激活**，收集向） |
| 世界合计 | ~1100-1400 段（4 分支世界） |
| choice 事件 | 10-15/分支（关键节点让你选） |
| choice target | 20-45/分支（选完后的分支剧情，MinSeconds=0 立即解锁） |
| 解锁节奏 | **MinSeconds 按 20 分钟/段递增**（1200 秒步进）；纯挂机 24 段/天 |
| 事件类型 | story（剧情，有效时长达到 MinSeconds 解锁） |
| 文本长度 | 30-80 字（推荐区间；build 只校验下限 10 字、无上限） |
| 叙事人称 | 第二人称"你" |
| 称号 | 15-20 个/世界（**旅程进度条件**：序章/首次抉择/通关分支/全分支/隐藏） |
| 成就 | ~20 个/世界 |
| 节日事件 | **无**（v4 已取消，节日走宠物语台词池） |
| 重生 | **无**（v4 删除重生系统；重访已通关世界=连续浏览模式） |
| 挂机机制 | standard / cultivation / cyber / tide / polar 五种 |

> 注意：filler（日常填充事件）机制已废弃（v3.4.0 移除），**不要生成 filler 类型事件**。

## 章节制创作（v4 核心）

**章节制**：序章 → 幕 → 终章，每章 8-15 段，章节衔接处放抉择。MinSeconds 是容量，节奏由内容决定，三条硬约束：

1. 故事从共享开篇（MinSeconds 0）开始铺垫
2. 分支结局是终章——最后 ~30-50 段留给"高潮→收尾→结局"
3. choice 均匀分布（章节衔接处放抉择）

规划模板（时间轴按 20 分钟/段换算，可自由改）：

| 模板 | 分段 | 适合 |
|------|------|------|
| 五段式 | 开端0-2h/成长2-17h/鼎盛17-33h/沉淀33-50h/终章50-58h | 人生传记类 |
| 三幕式 | 建立0-17h/对抗17-42h/收尾42-58h（比例可调） | 冒险/战争类 |
| 慢热式 | 长铺垫0-25h/展开25-52h/收尾52-58h | 悬疑/日常类 |

## 格式要点（v4 变更）

### Events 表（20 列）

| ID | Type | MinSeconds | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |

- **MinSeconds**（原 MinLevel）：解锁所需累计有效时长（秒），按 20 分钟/段（1200 秒）递增
- **Branch 列 `hidden` = 隐藏链**（全分支通关后激活）；空 = 共享事件
- **CompletionTitle 有值 = 结局事件**，必须位于分支链末尾（MinSeconds 最大）——validate_quality 校验
- **choice target 的 MinSeconds 固定 0**（读完 choice 立即解锁，不卡时间）

### Titles 表（旅程进度条件）

| Level | Name | Color | Description | ConditionType | ConditionValue |

- ConditionType：`level`（宠物等级）/ `opening`（共享开篇读完）/ `first_choice`（首次抉择）/ `branch`（通关分支，Value=分支名）/ `all_branches`（全分支通关）/ `hidden`（隐藏链激活）
- 留空 ConditionType = 默认 level

### Frontmatter

```yaml
---
id: backrooms              # 副本唯一 ID（小写字母 + 数字 + 下划线）
name: Wasteland             # 英文名称
name_cn: 废土               # 中文名称
description: 核战后的废土世界...  # 副本描述（一句话）
player_title: 拾荒者         # 玩家初始称号
language: zh                # 固定 zh
mechanic: standard          # 挂机机制：standard / cultivation / cyber / tide / polar
branches: [survivor, merchant, fugitive, ai]  # 分支列表
unlock_requirement:         # 解锁条件（v4 递进解锁）
  completions: 0            # 需要通关世界数
completion_title: 灰烬新生   # 通关后解锁的称号（各结局可独立设不同称号）
---
```

完整格式规范见 `docs/format-rules.md`（本项目根目录）。

## 硬规则（v4）

- 伏笔 flag 命名 `foreshadow_*`（validate_quality.cjs 据此查回收率）
- **伏笔必须同路径可回收**（回收事件在玩家必然能触发的路径上）
- **伏笔埋点（FlagSet foreshadow_*）必须放在必然触发的事件上**
- **choice target 在文件中的位置必须在 choice 事件之后**（保持可读性；引擎按 MinSeconds 排序取事件，target 被自动排除）
- **共享事件（无 Branch 列）只属于共享开篇**（0 - ~2h 时间轴，30-50 段）：写在分支段会抢占所有分支的触发
- **每个分支最后必须有一条无条件结局**（CompletionTitle 有值 + FlagRequire 留空），且是该分支 MinSeconds 最大的事件——防止 flag 组合落空时看不到结局
- **隐藏链（Branch=hidden）独立成链**：时间轴连续（validate_quality 校验），flag 由分支结局 FlagSet 驱动（如通关 survivor → 设 flag → 隐藏链中引用该 flag 的段落解锁）

### Stage 1.7：状态文件初始化

按 `references/state-file-spec.md` 在 `scenarios_wip/{id}/` 初始化：
- `meta.md`：frontmatter（独立文件，不含任何 ## 节——merge.cjs 要求）
- `content.md`：## Titles + ## Achievements 两段（一次性写好；**v4 无 HolidayEvents 段**）
- `state.md`：进行中状态（含全部规划表）
- `log.md` + `batches/`

> 注意：副本 id 不得与 `scenarios/` 或 `scenarios_user/` 下已有副本重复，否则 merge 会覆盖正式文件。

## 三稿制生成流程

> 原则：**一小段一小段来**。每批 20-50 条（一个完整剧情小节），生成完**全量展示**给你确认。宁可批多次、时间长，不要一次生成一大堆。

**批次切分方式（重要）：** **共享开篇批先写**（MinSeconds 0-7200 秒，30-50 段），**必须包含分支抉择事件及其全部 target**（各分支起点，Branch 列标注分支名）——否则中期验证会报 target 悬空；然后**分支逐一串行**（写完分支 A 全部段，再写分支 B……），每批 = 单分支的一个剧情小节（20-50 条）。state.md 的进度记录必须带分支名（如"survivor 已到第 N 幕"），保证续写断点无歧义。**隐藏链最后写**（全分支完成后再规划其 flag 引用）。

### 粗稿轮（保结构）

逐批循环（每批 ≈ 20-50 条事件，按剧情小节自然分片）：

```
1. 读 state.md → 确认本批范围（哪个分支的哪个章节）与承接 → 写本批骨架，如：
   骨架（survivor 第 2 幕）：①离开山谷 ②首次遇到商队 ③埋伏笔"铜钥匙" ④夜袭事件 ⑤小高潮：救下商人
2. 用户确认骨架 → 生成事件文本（结构优先：ID 连续、MinSeconds 递增、flag 正确、伏笔到位，文笔平实即可）
   写入批次文件（## Events 节 + 完整 20 列表）
3. 全量展示：本批事件全文 + 本批 flag/伏笔变化 + 与上批的承接
4. 用户点头 → 更新 state.md → 下一批
   用户要改 → 当场改 → 再确认
5. 每 5-6 批（约 100-150 段）做一次重型验证（见下）
```

**每批 AI 自检清单（提交展示前自查）：**
- [ ] 事件 ID 按编号规则连续，无重复/倒退
- [ ] MinSeconds 按 20 分钟/段递增，无长空白（>120 分钟间距）
- [ ] 本批 flag 设置/引用正确（对照 state.md 的 flag 清单）
- [ ] 本批开头承接上批段尾悬念
- [ ] 到期的伏笔已回收（查伏笔池）
- [ ] 角色状态与 state.md 一致（新出场/变化/死亡都要更新）

### 重型验证（每 5-6 批一次）

```
node merge.cjs scenarios/{id}.md scenarios_wip/{id}/meta.md scenarios_wip/{id}/content.md scenarios_wip/{id}/batches
node build.js
node validate_flags.cjs {id}
node validate_quality.cjs {id}
```

> 说明：batches 传**目录**（merge.cjs 自动按文件名排序展开目录内 .md）。meta.md / content.md 必须显式列出。merge 写入 scenarios/{id}.md 仅为验证手段——**副本完成前游戏会加载到半成品（缺分支/缺结局），完成前不要启动游戏游玩该副本**。

**验证结果解读：**
- **build 崩溃（throw 堆栈，非 ERROR 输出）**：几乎都是 choice target 悬空或格式错误——共享开篇批必须一次性包含分支抉择的**全部 target**，否则 build 直接中断且 **JSON 不更新**。修复后重跑 build
- `[ERROR]`：必须修复（格式/ID 重复/flag 断链），修复后重跑对应命令
- `[WARN]` 时间轴空白 / 伏笔未回收 / 结局位置：**生成中期属正常**（还没写到的分支/伏笔），精校轮必须清零
- `validate_flags` 输出 `❌` = 某 flag 设置后无事件引用：中期出现（引用在后续批次）属正常；**精校轮必须全部 ✅**
- exit code 提示：`validate_quality` 有 WARN 即返回 1，**生成中期属预期**，精校轮才要求 exit 0

### 细稿轮（打磨文笔）

粗稿全部完成后，逐批对照批次文件润色：
- AI 提润色方案（描写、语气、节奏），用户点头后改
- **用户也可直接改文笔**——修改写回批次文件，AI 同步更新 state.md（批次状态标为"已细稿/已改"）
- **用户改完每批后重新 merge + build 一次**（确认格式未被破坏），再继续下一批
- 每批细稿完同样展示确认
- 细稿进度记录在 state.md，精校轮据此确认"全部批已细稿"

### 精校轮（全量收尾）

- 重新 merge + 跑全量验证：`node build.js` + `node validate_flags.cjs {id}` + `node validate_quality.cjs {id}`——**要求 0 ERROR 且 0 WARN**（伏笔回收率 100%、时间轴连续、结局在链末尾）
- AI 通读全副本：角色前后矛盾、跨段承接、伏笔全部兑现、结局兜底存在、隐藏链 flag 引用闭环
- 用户终审 → 收工

## 跨会话（续写模式）

**为什么需要跨会话：** 副本内容量大（4 分支世界三稿 ≈ 30-50 万 token）。1M 上下文下通常一个会话跑完单个世界，但：
- 内容超出上下文 → 按分支/幕切会话
- 用户中途喊停 → 随时停

**会话边界仪式（每次会话结束/中断必做）：**
1. 当前批次的批次文件写完
2. state.md 更新完毕
3. log.md 追加断点摘要（3-5 行：当前轮次/进度/下一批承接）

**续写模式开场（用户说"继续"）：**
1. 列出 `scenarios_wip/` 下的状态文件，让用户确认续哪个
2. 读 state.md + log.md 最后断点
3. 展示进度摘要（轮次/章节/批数/待办）给用户确认
4. 从断点继续（不重放旧对话内容）

## 验证与收尾

| 验证 | 命令 | 时机 |
|------|------|------|
| 合并 | `node merge.cjs scenarios/{id}.md scenarios_wip/{id}/meta.md scenarios_wip/{id}/content.md scenarios_wip/{id}/batches` | 每 ~100-150 段 / 粗稿轮完成 / 精校轮收尾 |
| 构建 | `node build.js` | 合并后 |
| flag 链 | `node validate_flags.cjs {id}` | 每 ~100-150 段 / 精校轮 |
| 质量 | `node validate_quality.cjs {id}` | 每 ~100-150 段 / 精校轮（精校轮要求 0 ERROR 0 WARN） |

## 注意事项（避免翻车）

- 文件第一行必须是 `---`（不能有 BOM）
- **所有表（Events/Titles/Achievements）内部都不能有空行**（空行会导致 parseTable 提前终止）
- 每行 pipe table 必须以 `|` 开头和结尾，Events 20 列
- choice target 事件 ID 必须在表中存在
- 事件文本不少于 10 字（build 校验）
- **MinSeconds 20 分钟/段递增**；choice target 为 0；结局事件（CompletionTitle）在分支链末尾
- 所有文本用第二人称"你"写
- 不要生成 filler 事件（机制已废弃）
- 不要生成节日事件（v4 已取消）
- 记忆靠 `scenarios_wip/` 状态文件，**不靠对话历史**（违反会导致错漏）

## 参考文件

| 文件 | 作用 |
|------|------|
| `docs/format-rules.md` | 完整格式规范（v4：MinSeconds/旅程进度称号/隐藏链/结局规则） |
| `references/format-rules.md` | 旧版格式规范存档（v3，勿用于新副本） |
| `references/state-file-spec.md` | 状态文件三件套规范（记忆系统） |
| `references/adaptation-guide.md` | 小说改编流程（改编模式必读） |
| `scenarios/` | 已有副本参考 |
| `node build.js` / `validate_*.cjs` | 验证脚本 |
