---
id: hello_world
name: Hello World
name_cn: 你好世界
description: 一个极简的示例副本，仅 10 级，快速了解副本格式
player_title: 旅人
language: zh
mechanic: standard
max_rebirth: 0
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

| ID | Type | MinLevel | Weight | Once | Choice1 | Choice1Target | Choice2 | Choice2Target | Text |
|---|---|---|---|---|---|---|---|---|---|
| s_01 | story | 1 | 1 | yes | | | | | 你睁开眼睛，阳光透过树叶洒在脸上。你坐起来，发现自己躺在一片陌生的草地上。远处有一座小镇的轮廓。 |
| s_02 | story | 2 | 1 | yes | | | | | 你走进小镇，街上的行人对你微笑致意。一个面包店的老板递给你一块刚出炉的面包。"新来的吧？先吃点东西。" |
| s_03 | story | 3 | 1 | yes | | | | | 你在镇中心发现一块公告板。上面贴满了各种委托。你撕下一张纸条，决定去镇外的森林看看。 |
| s_04 | story | 4 | 1 | yes | 推开塔门 | s_05a | 绕塔观察 | s_05b | 森林里比想象中安静。你沿小径走了半小时，看到一座被藤蔓覆盖的石塔。 |
| s_05a | story | 5 | 1 | yes | | | | | 你推开塔门，里面是一位白发老人坐在摇椅上。"等你好久了，坐吧。" |
| s_05b | story | 5 | 1 | yes | | | | | 你绕塔走了一圈，发现塔身刻满了古老的符文，在夕阳下微微发光。 |
| s_06 | story | 6 | 1 | yes | | | | | 你发现这座塔曾经是世界的瞭望台，能看到所有角落发生的事。但力量渐渐消散了。 |
| s_07 | story | 7 | 1 | yes | | | | | 你在塔顶找到了一颗暗淡的水晶球。你触碰它时，球体突然发出柔和的光。 |
| s_08 | story | 8 | 1 | yes | | | | | 水晶球的光芒越来越亮，最终化作一道光柱射向天空。塔重新亮了。 |
| s_09 | story | 9 | 1 | yes | | | | | 你回到小镇，镇民们聚集在广场上。镇长握住你的手："你给这里带来了希望。" |
| s_10 | story | 10 | 1 | yes | | | | | 你站在小镇外的山丘上，回望这片土地。前方还有更多的故事在等你。 |
| f_01 | filler | 1 | 5 | no | 阳光温暖，微风拂面。今天是个好日子。 |
| f_02 | filler | 1 | 5 | no | 你听到远处传来孩子的笑声。 |
| f_03 | filler | 2 | 5 | no | 面包店飘来诱人的香气。 |
| f_04 | filler | 2 | 5 | no | 一只橘猫在墙头打盹，尾巴轻轻摆动。 |
| f_05 | filler | 3 | 5 | no | 公告板上多了几张新的委托。 |
| f_06 | filler | 3 | 5 | no | 一片落叶飘到你的肩头。 |
| f_07 | filler | 4 | 5 | no | 森林里的鸟鸣声此起彼伏。 |
| f_08 | filler | 4 | 5 | no | 你在一棵树下发现了一朵蓝色的小花。 |
| f_09 | filler | 5 | 5 | no | 塔里的灯光在远处隐约可见。 |
| f_10 | filler | 5 | 5 | no | 老人哼着一首古老的曲子。 |
| f_11 | filler | 6 | 5 | no | 水晶球在你手中微微发暖。 |
| f_12 | filler | 6 | 5 | no | 塔顶的风很大，但景色很美。 |
| f_13 | filler | 7 | 5 | no | 你看到远方有一片金色的麦田。 |
| f_14 | filler | 7 | 5 | no | 云朵在天空中缓缓移动。 |
| f_15 | filler | 8 | 5 | no | 广场上的喷泉在阳光下闪闪发光。 |
| f_16 | filler | 8 | 5 | no | 镇民们对你投来友善的目光。 |
| f_17 | filler | 9 | 5 | no | 镇长办公室的窗台上放着一盆盛开的花。 |
| f_18 | filler | 9 | 5 | no | 你听到钟楼传来了悠扬的钟声。 |
| f_19 | filler | 10 | 5 | no | 山丘上的风吹动你的衣角。 |
| f_20 | filler | 10 | 5 | no | 前方是一条延伸向远方的路。 |

## Achievements

| ID | Name | Description | Icon | ConditionType | ConditionValue |
|---|---|---|---|---|---|
| ach_traveler | 旅人 | 到达 1 级 | ★ | level | 1 |
| ach_explorer | 探索者 | 到达 5 级 | ★ | level | 5 |
| ach_completer | 完成者 | 到达 10 级 | ★ | level | 10 |

## HolidayEvents

| ID | HolidayID | Type | MinLevel | Weight | Once | Text |
|---|---|---|---|---|---|---|
| h_spring | spring_festival | day | 1 | 5 | no | 小镇里挂满了红灯笼，空气中弥漫着鞭炮的味道。有人递给你一碗热气腾腾的饺子。"新年快乐！" |
| h_spring_adv | spring_festival | advance | 1 | 5 | no | 镇民们开始忙碌起来，到处贴着红色的剪纸。春节要到了。 |
