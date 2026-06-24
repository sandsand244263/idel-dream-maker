# 创建你的第一个副本

本教程带你从零创建一个可运行的副本。

## 准备工作

不需要任何编程知识，只需要一个文本编辑器（记事本也可以）。

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
max_rebirth: 0
unlock_requirement:
  hub_level: 0
  completions: 0
completion_title: 初体验
---

```

用 `---` 包裹，这是副本的元数据。

## 第三步：添加称号

接着写称号表：

```
## Titles

| Level | Name | Color | Description |
|---|---|---|---|
| 1 | 新手 | #888888 | 刚开始旅程 |
| 5 | 探索者 | #66BB6A | 开始探索世界 |
| 10 | 老手 | #FF9800 | 已经有些经验了 |
```

最少 3 个称号，按等级升序排列。

## 第四步：添加事件

接着写事件表。v3.0.0 之后可以在关键节点加上选择分支：

```
## Events

| ID | Type | MinLevel | Weight | Once | Choice1 | Choice1Target | Choice2 | Choice2Target | Text |
|---|---|---|---|---|---|---|---|---|---|
| s_01 | story | 1 | 1 | yes | | | | | 你睁开眼睛，发现自己身处一个陌生的世界。 |
| s_02 | story | 2 | 1 | yes | | | | | 你开始探索周围的环境，发现了一片森林。 |
| s_03 | story | 3 | 1 | yes | | | | | 你在森林深处找到了一间小屋。 |
| s_04 | story | 5 | 1 | yes | | | | | 小屋里有一位老人，他给了你一张地图。 |
| s_05 | story | 10 | 1 | yes | | | | | 你终于找到了传说中的宝藏。 |
| s_06 | story | 12 | 1 | yes | 收下老人的礼物 | s_07a | 婉拒离开 | s_07b | 老人拿出一件礼物递给你... |
| s_07a | story | 13 | 1 | yes | | | | | 你收下礼物，老人微笑着送你离开。 |
| s_07b | story | 13 | 1 | yes | | | | | 你婉拒了礼物，老人点点头收回了手。 |
| f_01 | filler | 1 | 5 | no | | | | | 今天天气不错，你在路边看到一朵小花。 |
```

- **story** 事件：用 Type=story，Once=yes，每个等级触发一个剧情
- **choice** 事件：在 story 上加 Choice1/Choice1Target 列，选项文本 10 字以内，target 事件 ID 用 `{编号}a` / `{编号}b`
- **filler** 事件：用 Type=filler，Once=no，随机触发日常见闻

## 第五步：保存并运行

1. 保存文件
2. 启动游戏：`npm run electron:dev`
3. 游戏启动时会自动扫描 `scenarios_user/` 目录，你的副本就会出现在大厅里

## 完整示例

完整的可运行示例见 `docs/example-hello-world.md`。

## 分享副本

把你的 `.md` 文件发给别人，他们放到自己的 `scenarios_user/` 目录下，重启游戏就能玩。
