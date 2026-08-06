---
id: hello_world
name: Hello World
name_cn: 你好世界
description: 一个极简示例副本（共享开篇 + 2 分支，各带结局），展示 v4 旅程制格式
player_title: 旅人
language: zh
mechanic: standard
branches: [road, forest]
unlock_requirement:
  completions: 0
completion_title: 初窥门径
---

## Titles

| Level | Name | Color | Description | ConditionType | ConditionValue |
|---|---|---|---|---|---|
| | 旅人 | #888888 | 你踏上了旅程 | opening | |
| | 漫步者 | #AAAAAA | 你开始习惯路上的风景 | first_choice | |
| | 走大路的人 | #66BB6A | 你走完了官道 | branch | road |
| | 穿林者 | #FF9800 | 你走完了林间小径 | branch | forest |
| | 世界的见证者 | #5C6BC0 | 两条路你都走过了 | all_branches | |

## Events

| ID | Type | MinSeconds | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hw_e0001 | story | 0 | 0 | 1 | 是 | | | | | | | | | | | | | 醒来 | 你睁开眼睛，阳光透过树叶洒在脸上。你坐起来，发现自己躺在一片陌生的草地上。远处有一座小镇的轮廓。 |
| hw_e0002 | story | 1200 | 0 | 1 | 是 | | | | | | | | | | | | | 进镇 | 你走进小镇，街上的行人对你微笑致意。一个面包店的老板递给你一块刚出炉的面包。"新来的吧？先吃点东西。" |
| hw_e0003 | story | 2400 | 0 | 1 | 是 | | | | | 走大路 | hw_e0003a | 穿森林 | hw_e0003b | | | | | 抉择 | 镇口有两条路：一条是宽阔的官道，一条是幽暗的林间小径。你选择—— |
| hw_e0003a | story | 0 | 0 | 1 | 是 | road | | | | | | | | | | | | 上路 | 你踏上官道，阳光铺满路面，远处传来商队的驼铃声。 |
| hw_e0003b | story | 0 | 0 | 1 | 是 | forest | | | | | | | | | | | | 入林 | 你钻入林间，脚下是松软的落叶，空气中弥漫着湿润的泥土气息。 |
| hw_e0004 | story | 1200 | 0 | 1 | 是 | road | | | | | | | | | | | | 邂逅 | 你遇到一队商队，领队是个红脸膛的壮汉。"小兄弟，一个人走这条路？上来搭个伴吧。" |
| hw_e0005 | story | 1200 | 0 | 1 | 是 | forest | | | | | | | | | | | | 发现 | 你在林中空地发现了一座被藤蔓覆盖的石塔。塔门半掩，里面透出微光。 |
| hw_e0006 | story | 2400 | 0 | 1 | 是 | road | | | | | | | | | | | | 同行 | 商队的壮汉递给你一个水囊。"前面有个驿站，到那儿歇歇脚。" |
| hw_e0007 | story | 2400 | 0 | 1 | 是 | forest | | | | | | | | | | | | 探索 | 塔内有一位白发老人坐在摇椅上。"等你好久了，年轻人。这座塔曾是世界的瞭望台。" |
| hw_e0008 | story | 3600 | 0 | 1 | 是 | road | | | | | | | | | | | | 驿站 | 驿站里热热闹闹，有人在弹琴，有人在喝酒。你找了个角落坐下。 |
| hw_e0009 | story | 3600 | 0 | 1 | 是 | forest | | | | | | | | | | | | 秘密 | 老人在塔顶找到一颗暗淡的水晶球。"它失去了力量，但你能把它重新点亮。" |
| hw_e0010 | story | 4800 | 0 | 1 | 是 | road | | | | 初窥门径 | | | | | | | | | 告别 | 你继续上路，前方是一片开阔的平原。风很大，但你的脚步很稳。 |
| hw_e0011 | story | 4800 | 0 | 1 | 是 | forest | | | | 点亮塔光 | | | | | | | | | 光柱 | 水晶球在你手中亮起，一道光柱射向天空。老人微笑着说："你做到了。" |

## Achievements

| ID | Name | Description | Icon | ConditionType | ConditionValue | FlagRequire |
|---|---|---|---|---|---|---|
| hw_a001 | 初醒 | 宠物到达 1 级 | ★ | level | 1 | |
| hw_a002 | 旅人 | 宠物到达 5 级 | ★ | level | 5 | |
| hw_a003 | 探索者 | 宠物到达 10 级 | ★ | level | 10 | |