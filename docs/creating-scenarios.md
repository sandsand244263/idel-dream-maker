# 创建你的第一个副本

本教程带你从零创建一个可运行的副本（v4 旅程制）。不需要任何编程知识，只需要一个文本编辑器（记事本也可以）。

## 第一步：创建文件

在 `scenarios_user/` 目录下新建一个文本文件，命名为 `my-first-scenario.md`。

> 如果 `scenarios_user/` 目录不存在，手动创建它。

## 第二步：写 Frontmatter

复制以下内容到文件开头：

```yaml
---
id: my_first_scenario
name: My First Scenario
name_cn: 我的第一个副本
description: 一个简单的示例副本
player_title: 新手
language: zh
mechanic: standard
branches: [forest, mountain]
unlock_requirement:
  completions: 0
completion_title: 初体验
---
```

- `id`：副本唯一标识，小写字母+数字+下划线
- `branches`：分支列表。玩家在**共享开篇末段**通过抉择选择走哪条分支，每条分支有独立故事
- `unlock_requirement.completions`：解锁需要已通关的世界数（0 = 默认解锁）

## 第三步：添加称号（旅程进度条件）

称号按**旅程进度**解锁（v4）：序章读完 / 首次抉择 / 通关分支 / 全分支通关 / 隐藏链。`Level` 列可留空，用 `ConditionType` 指定条件：

```
## Titles

| Level | Name | Color | Description | ConditionType | ConditionValue |
|---|---|---|---|---|---|
| | 新手 | #888888 | 刚开始旅程 | opening | |
| | 探索者 | #66BB6A | 做出了第一次选择 | first_choice | |
| | 森林之子 | #FF9800 | 走完了森林之路 | branch | forest |
| | 山巅之人 | #9C27B0 | 走完了山岭之路 | branch | mountain |
| | 世界的旅人 | #2196F3 | 看完了这个世界的一切 | all_branches | |
```

## 第四步：添加事件

事件是副本的核心。v4 使用 20 列格式，按 **MinSeconds**（挂机时长，秒）解锁——每 20 分钟（1200 秒）一段。

```
## Events

| ID | Type | MinSeconds | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mfs_e0001 | story | 0 | 0 | 1 | 是 | | | | | | | | | | | | | 醒来 | 你睁开眼睛，发现自己身处一个陌生的世界。 |
| mfs_e0002 | story | 1200 | 0 | 1 | 是 | | | | | | | | | | | | | 探索 | 你开始探索周围，发现了一片森林。 |
| mfs_e0003 | story | 2400 | 0 | 1 | 是 | | | | | | | | | | | | | 寻路 | 森林深处有一间小屋。 |
| mfs_e0004 | story | 3600 | 0 | 1 | 是 | | | | | | | | | | | | | 相遇 | 小屋里有位老人，他给了你一张地图。 |
| mfs_e0005 | story | 4800 | 0 | 1 | 是 | | | | | 穿过森林 | mfs_e0005a | 翻过山脉 | mfs_e0005b | | | | | 抉择 | 你站在岔路口，地图上标注了两条路... |
| mfs_e0005a | story | 0 | 0 | 1 | 是 | forest | | | | | | | | | | | | 行路 | 你钻进密林，脚下是厚厚的落叶。 |
| mfs_e0005b | story | 0 | 0 | 1 | 是 | mountain | | | | | | | | | | | | 攀登 | 你开始爬上山腰，风很大。 |
| mfs_e0006 | story | 1200 | 0 | 1 | 是 | forest | | | | | | | | | | | | 深入 | 你在森林中发现了一条隐秘小径... |
```

关键点：
- ID 格式：`{id}_e{四位编号}`，从 `e0001` 开始递增
- **共享开篇**（MinSeconds 0 起，30-50 段）末尾是**分支抉择**：选项的 target 事件（`e0005a`/`e0005b`）Branch 列决定玩家走哪条分支
- **choice target 的 MinSeconds 固定为 0**（读完选择立即解锁，不卡时间）
- Branch 为空的事件 = 共享事件（所有分支都能触发）；Branch 非空 = 专属某分支
- 分支内事件按 MinSeconds 递增（1200 秒一段 = 20 分钟）

### 加点 Flag（旗标）控制剧情

如果你想做关键抉择影响后续剧情，用 FlagSet 和 FlagRequire：

```
| mfs_e0050 | story | 12000 | 0 | 1 | 是 | forest | | | | 帮忙 | mfs_e0050a | 拒绝 | mfs_e0050b | | | | | 遇险 | 路上遇到一个受伤的旅人... |
| mfs_e0050a | story | 0 | 0 | 1 | 是 | forest | helped_stranger=true | | | | | | | | | | | 援手 | 你帮旅人包扎了伤口。 |
| mfs_e0050b | story | 0 | 0 | 1 | 是 | forest | helped_stranger=false | | | | | | | | | | | 离去 | 你继续赶路，没有回头。 |
```

后续事件可以用 FlagRequire 条件判断：

```
| mfs_e0100 | story | 24000 | 0 | 1 | 是 | forest | | helped_stranger=true | | | | | | | | | | | 重逢 | 旅人再次出现，他原来是个商人... |
```

### 结局

分支结局 = **CompletionTitle 列有值的事件**，读完该段即触发通关（解锁通关称号 + 记录通关）。**每个分支最后必须有一个无条件结局**（CompletionTitle 有值 + FlagRequire 留空），且位于该分支链末尾。

## 第五步：保存并运行

1. 保存文件
2. 启动游戏：`npm run electron:dev`
3. 游戏启动时会自动扫描 `scenarios_user/` 目录，你的副本就会出现在家里（世界选择）

## 完整示例

可运行的完整最小示例见 `docs/example-hello-world.md`。

## 进阶提示

- **15-20 个称号**，按旅程进度解锁（序章/首次抉择/通关分支/全分支/隐藏链）
- **~20 个成就**，四种条件类型（level / runtime / events / titles）
- **节日**：v4 已取消节日事件表，节日祝福由宠物台词池负责
- 用 AI 生成请把 `docs/ai-prompt-template.md` 复制给 AI
- 大量副本创作推荐用项目内的 ScenarioWriter skill

## 分享副本

把你的 `.md` 文件发给别人，他们放到自己的 `scenarios_user/` 目录下，重启游戏就能玩。