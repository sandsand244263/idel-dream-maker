---
id: hello_world
name: Hello World
name_cn: 你好世界
description: 一个极简示例副本（10 级，2 分支），展示 20 列分支叙事格式
player_title: 旅人
language: zh
mechanic: standard
branches: [road, forest]
unlock_requirement:
  hub_level: 0
  completions: 0
completion_title: 初窥门径
---

## Titles

| Level | Name | Color | Description |
|---|---|---|---|
| 1 | 旅人 | #888888 | 你踏上了旅程 |
| 2 | 漫步者 | #AAAAAA | 你开始习惯路上的风景 |
| 3 | 探路者 | #66BB6A | 你在前方寻找方向 |
| 5 | 见证者 | #FF9800 | 你见证了许多故事 |
| 8 | 归来者 | #5C6BC0 | 旅程即将结束 |
| 10 | 初窥者 | #FFD700 | 你看到了世界的一角 |

## Events

| ID | Type | MinLevel | MinHours | Weight | Once | Branch | FlagSet | FlagRequire | CompletionTitle | Choice1 | Choice1Target | Choice2 | Choice2Target | Choice3 | Choice3Target | Choice4 | Choice4Target | Action | Text |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hw_e0001 | story | 1 | 0 | 1 | 是 | | | | | | | | | | | | | 醒来 | 你睁开眼睛，阳光透过树叶洒在脸上。你坐起来，发现自己躺在一片陌生的草地上。远处有一座小镇的轮廓。 |
| hw_e0002 | story | 2 | 0 | 1 | 是 | | | | | | | | | | | | | 进镇 | 你走进小镇，街上的行人对你微笑致意。一个面包店的老板递给你一块刚出炉的面包。"新来的吧？先吃点东西。" |
| hw_e0003 | story | 3 | 0 | 1 | 是 | | | | | 走大路 | hw_e0003a | 穿森林 | hw_e0003b | | | | | 抉择 | 镇口有两条路：一条是宽阔的官道，一条是幽暗的林间小径。你选择—— |
| hw_e0003a | story | 3 | 0 | 1 | 是 | road | | | | | | | | | | | | 上路 | 你踏上官道，阳光铺满路面，远处传来商队的驼铃声。 |
| hw_e0003b | story | 3 | 0 | 1 | 是 | forest | | | | | | | | | | | | 入林 | 你钻入林间，脚下是松软的落叶，空气中弥漫着湿润的泥土气息。 |
| hw_e0004 | story | 4 | 0 | 1 | 是 | road | | | | | | | | | | | | 邂逅 | 你遇到一队商队，领队是个红脸膛的壮汉。"小兄弟，一个人走这条路？上来搭个伴吧。" |
| hw_e0005 | story | 5 | 0 | 1 | 是 | forest | | | | | | | | | | | | 发现 | 你在林中空地发现了一座被藤蔓覆盖的石塔。塔门半掩，里面透出微光。 |
| hw_e0006 | story | 6 | 0 | 1 | 是 | road | | | | | | | | | | | | 同行 | 商队的壮汉递给你一个水囊。"前面有个驿站，到那儿歇歇脚。" |
| hw_e0007 | story | 7 | 0 | 1 | 是 | forest | | | | | | | | | | | | 探索 | 塔内有一位白发老人坐在摇椅上。"等你好久了，年轻人。这座塔曾是世界的瞭望台。" |
| hw_e0008 | story | 8 | 0 | 1 | 是 | road | | | | | | | | | | | | 驿站 | 驿站里热热闹闹，有人在弹琴，有人在喝酒。你找了个角落坐下。 |
| hw_e0009 | story | 9 | 0 | 1 | 是 | forest | | | | | | | | | | | | 秘密 | 老人在塔顶找到一颗暗淡的水晶球。"它失去了力量，但你能把它重新点亮。" |
| hw_e0010 | story | 10 | 0 | 1 | 是 | road | | | | | | | | | | | | 告别 | 你继续上路，前方是一片开阔的平原。风很大，但你的脚步很稳。 |
| hw_e0011 | story | 10 | 0 | 1 | 是 | forest | | | | | | | | | | | | 光柱 | 水晶球在你手中亮起，一道光柱射向天空。老人微笑着说："你做到了。" |

## Achievements

| ID | Name | Description | Icon | ConditionType | ConditionValue | FlagRequire |
|---|---|---|---|---|---|---|
| hw_a001 | 初醒 | 到达 1 级 | ★ | level | 1 | |
| hw_a002 | 旅人 | 到达 5 级 | ★ | level | 5 | |
| hw_a003 | 探索者 | 到达 10 级 | ★ | level | 10 | |

## HolidayEvents

| ID | HolidayID | Type | MinLevel | MinHours | Weight | Once | Text |
|---|---|---|---|---|---|---|---|
| hw_h001 | spring_festival | advance | 1 | 0 | 1 | 是 | 小镇里挂起了红灯笼，空气中飘着鞭炮的味道。有人在贴春联。 |
| hw_h002 | spring_festival | day | 1 | 0 | 1 | 是 | 小镇热闹极了，到处是孩子的笑声和爆竹声。有人递给你一碗热气腾腾的饺子。"新年快乐！" |
