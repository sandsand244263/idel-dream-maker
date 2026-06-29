# 创建你的第一个副本

本教程带你从零创建一个可运行的副本。不需要任何编程知识，只需要一个文本编辑器（记事本也可以）。

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
  hub_level: 0
  completions: 0
completion_title: 初体验
---

```

- `id`：副本唯一标识，小写字母+数字+下划线
- `branches`：分支列表。玩家 Lv.5 时会选择走哪条分支，每条分支有独立故事

## 第三步：添加称号

接着写称号表，跨分支共用：

```
## Titles

| Level | Name | Color | Description |
|---|---|---|---|
| 1 | 新手 | #888888 | 刚开始旅程 |
| 5 | 探索者 | #66BB6A | 开始探索世界 |
| 10 | 老手 | #FF9800 | 已经有些经验了 |
```

## 第四步：添加事件

事件是副本的核心。v3.4.0 起使用 20 列格式，支持分支叙事和选择分支。

```
## Events

| ID | Type | MinLevel | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mfs_e0001 | story | 1 | 0 | 1 | 是 | | | | | | | | | | | | | 醒来 | 你睁开眼睛，发现自己身处一个陌生的世界。 |
| mfs_e0002 | story | 2 | 0 | 1 | 是 | | | | | | | | | | | | | 探索 | 你开始探索周围，发现了一片森林。 |
| mfs_e0003 | story | 3 | 0 | 1 | 是 | | | | | | | | | | | | | 寻路 | 森林深处有一间小屋。 |
| mfs_e0004 | story | 4 | 0 | 1 | 是 | | | | | | | | | | | | | 相遇 | 小屋里有位老人，他给了你一张地图。 |
| mfs_e0005 | story | 5 | 0 | 1 | 是 | | | | | 穿过森林 | mfs_e0005a | 翻过山脉 | mfs_e0005b | | | | | 抉择 | 你站在岔路口，地图上标注了两条路... |
| mfs_e0005a | story | 5 | 0 | 1 | 是 | forest | | | | | | | | | | | | 行路 | 你钻进密林，脚下是厚厚的落叶。 |
| mfs_e0005b | story | 5 | 0 | 1 | 是 | mountain | | | | | | | | | | | | 攀登 | 你开始爬上山腰，风很大。 |
| mfs_e0006 | story | 6 | 0 | 1 | 是 | forest | | | | | | | | | | | | 深入 | 你在森林中发现了一条隐秘小径... |
```

关键点：
- ID 格式：`{id}_e{四位编号}`，从 `e0001` 开始递增
- Lv.5 是**分支抉择点**：4 个选项对应 4 条分支（这里简化为 2 条：forest / mountain）。选择后目标事件的 Branch 列决定了玩家走哪条分支
- Branch 为空的事件 = 共享事件（所有分支都能触发）
- Branch 非空的事件 = 专属某分支（如 `forest`）
- 后面每个等级一条 story，逐级递增到 500

### 加点 Flag（旗标）控制剧情

如果你想做关键抉择影响后续剧情，用 FlagSet 和 FlagRequire：

```
| mfs_e0050 | story | 50 | 0 | 1 | 是 | forest | | | | 帮忙 | mfs_e0050a | 拒绝 | mfs_e0050b | | | | | 遇险 | 路上遇到一个受伤的旅人... |
| mfs_e0050a | story | 50 | 0 | 1 | 是 | forest | helped_stranger=true | | | | | | | | | | | 援手 | 你帮旅人包扎了伤口。 |
| mfs_e0050b | story | 50 | 0 | 1 | 是 | forest | helped_stranger=false | | | | | | | | | | | 离去 | 你继续赶路，没有回头。 |
```

后续事件可以用 FlagRequire 条件判断：

```
| mfs_e0100 | story | 100 | 0 | 1 | 是 | forest | | helped_stranger=true | | | | | | | | | | | 重逢 | 旅人再次出现，他原来是个商人... |
```

### 结局

Lv.500 自动触发结局。在最后一个 story 事件上加 CompletionTitle 可以解锁专属通关称号。

## 第五步：保存并运行

1. 保存文件
2. 启动游戏：`npm run electron:dev`
3. 游戏启动时会自动扫描 `scenarios_user/` 目录，你的副本就会出现在大厅里

## 完整示例

可运行的完整最小示例见 `docs/example-hello-world.md`。

## 进阶提示

- **30 个称号**，分布在 Lv.1-500，跨分支共用
- **50 个成就**，四种条件类型（level / runtime / events / titles）
- **52 条节日事件**（26 个节日 × 2），每个节日 1 条 advance + 1 条 day
- 用 AI 生成请把 `docs/ai-prompt-template.md` 复制给 AI
- 大量副本创作推荐用项目内的 ScenarioWriter skill

## 分享副本

把你的 `.md` 文件发给别人，他们放到自己的 `scenarios_user/` 目录下，重启游戏就能玩。
