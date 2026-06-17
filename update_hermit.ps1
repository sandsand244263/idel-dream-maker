# hermit.md 更新脚本
# 用途：添加 Type 列、ID 4位化、生成 filler 事件
$ErrorActionPreference = "Stop"
$filePath = "E:\工作内容\11_vibe-coding项目\Idel-DreamMaker\scenarios\hermit.md"

# 读取当前文件行
$lines = Get-Content -Path $filePath

# 定位各章节位置
$titlesStart = $lines.IndexOf("## Titles")
$eventsStart = $lines.IndexOf("## Events")
$achievementsStart = $lines.IndexOf("## Achievements")
$holidayStart = $lines.IndexOf("## HolidayEvents")

Write-Host "章节位置: Titles=$titlesStart Events=$eventsStart Achievements=$achievementsStart Holiday=$holidayStart"

# ===== 1. 处理 Frontmatter + Titles（保持不变）=====
$output = @()
$output += $lines[0..($eventsStart - 1)]
$output += ""

# ===== 2. 处理 Events 表头 =====
$output += "## Events"
$output += ""
$output += "| ID | Type | MinLevel | MinHours | Weight | Once | Text |"
$output += "|----|------|----------|----------|--------|------|------|"

# ===== 3. 处理 Story Events（添加 Type=story，ID 4位化）=====
for ($i = $eventsStart + 3; $i -lt $achievementsStart - 1; $i++) {
    $line = $lines[$i]
    if ($line -match '^\| h_e(\d{3,4}) \|') {
        $oldId = $matches[0]
        $num = [int]$matches[1]
        $newId = "h_e{0:D4}" -f $num
        
        # 替换 ID 并插入 story 列
        # 格式: | h_e001 | 1 | 0 | 1 | 是 | text |
        # 变:  | h_e0001 | story | 1 | 0 | 1 | 是 | text |
        $rest = $line.Substring($oldId.Length)
        $newLine = "| $newId | story$rest"
        $output += $newLine
    }
}

# ===== 4. 生成 Filler Events =====
Write-Host "开始生成 filler 事件..."

# 定义 filler 事件生成函数
function Get-FillerText {
    param($level, $index)
    
    # 按类别轮换
    $category = $index % 25
    
    # 天气/时节修饰
    $weatherModifiers = @(
        "清晨", "午后", "黄昏", "傍晚", "深夜", "正午", "黎明", "入夜",
        "天刚亮", "太阳西斜", "月挂中天", "细雨绵绵", "天高云淡", 
        "山风习习", "晨雾缭绕", "晚霞满天", "星光点点", "微风拂面",
        "秋高气爽", "春寒料峭", "夏日炎炎", "冬雪皑皑",
        "雨后初晴", "阴云密布", "晴空万里", "薄雾如纱",
        "旭日东升", "夕阳西下", "夜凉如水", "晨露未干"
    )
    
    $weather = $weatherModifiers[$index % $weatherModifiers.Count]
    
    switch ($category) {
        0 { # 砍柴挑水
            @(
                "$weather，你拿起斧头去屋后劈柴。木屑飞溅，散发着松木的清香。",
                "$weather你挑着木桶去溪边。水声叮咚，你弯腰打起两桶清澈的山泉。",
                "$weather你蹲在溪边洗衣。溪水冰凉，你搓得很仔细。",
                "$weather你把劈好的柴火码在屋檐下。整整齐齐的，看着就舒服。",
                "$weather你去溪边挑水。水面映着你的脸，你对自己笑了一下。",
                "$weather你修理了柴房的破门。换了一块新木板，钉子敲得很实在。",
                "$weather你把柴刀磨了磨。刀刃在阳光下闪着寒光。",
                "$weather你给屋檐下的水缸加满了水。够用好几天了。"
            )
        }
        1 { # 种菜
            @(
                "$weather你去菜地看了看。青菜又长高了一截，叶子绿得发亮。",
                "$weather你蹲在菜地里拔草。杂草不多，你很快就做完了。",
                "$weather你给菜地浇了水。水珠在叶子上滚动，像一颗颗透明的珠子。",
                "$weather你摘了一些豆角。够炒一盘了。",
                "$weather你翻了一小块新地。准备种一些萝卜。",
                "$weather你在菜地里发现了一条小蚯蚓。你把它轻轻放回土里。",
                "$weather你给南瓜藤搭了一个架子。藤蔓顺着架子往上爬。",
                "$weather你收了几个番茄。红彤彤的，你忍不住生吃了一个。"
            )
        }
        2 { # 采药
            @(
                "$weather你背上竹篓去采药。山里的药材越来越多了。",
                "$weather你在一处石缝里发现了一株灵芝。品相很好，你小心翼翼地采下。",
                "$weather你把采来的草药摊在院子里晾晒。满院都是药香。",
                "$weather你尝了一味新草药。微苦，回甘。你记下了它的味道。",
                "$weather你整理药柜。把晒干的药材分门别类装好。",
                "$weather你在山坡上发现了一片野生的金银花。花蕾饱满。",
                "$weather你采了一些薄荷。泡茶时放两片，清凉提神。",
                "$weather你把采来的艾草编成绳子。晒干后可以用来驱蚊。"
            )
        }
        3 { # 做饭饮食
            @(
                "$weather你在灶台前生火做饭。炊烟袅袅升起，融入山间的雾气。",
                "$weather你煮了一锅青菜粥。简简单单的，但很香。",
                "$weather你烤了几个红薯。外皮焦黑，里面金黄流蜜。",
                "$weather你用野葱炒了一盘鸡蛋。香气四溢。",
                "$weather你腌了一些咸菜。装进坛子里，等过些日子再吃。",
                "$weather你煮了一壶山泉水。泡上一杯野茶，坐在凉亭里慢慢喝。",
                "$weather你在溪水里冰了一个西瓜。切开时凉丝丝的。",
                "$weather你蒸了一锅馒头。白胖白胖的，你吃了两个。"
            )
        }
        4 { # 读书写字
            @(
                "$weather你坐在窗前读书。山风翻动着书页，你按住了又继续读。",
                "$weather你研墨铺纸，提笔写字。今天抄了一篇庄子。",
                "$weather你翻开那卷古琴谱。虽然已经读过很多遍，每次都有新的领悟。",
                "$weather你在纸上画了一幅兰草图。虽然简单，但自有一种清雅。",
                "$weather你读着读着就忘了时间。直到光线暗了才回过神来。",
                "$weather你写了一封没有收信人的信。写完后又收了起来。",
                "$weather你在旧书的扉页上写了一句批注。也许以后会有人看到。",
                "$weather你把前些日子写的诗重新读了一遍。改了几个字。"
            )
        }
        5 { # 弹琴
            @(
                "$weather你坐在凉亭里弹琴。琴声在山谷中飘荡。",
                "$weather你练了一首新曲子。手指在琴弦上飞舞。",
                "$weather你调了调琴弦。音准又跑了一些。山中的湿度总是让琴弦变化。",
                "$weather你弹了一曲流水。听着琴声，仿佛自己也变成了山中的溪水。",
                "$weather你闭上眼睛弹琴。不看琴弦，只听声音。",
                "$weather你把琴放在膝上，轻轻拨弄着弦。没有曲调，只是随意的音。",
                "$weather你的琴声引来了几只鸟。它们在树枝上歪着头听。",
                "$weather你在琴声中度过了一个下午。停下来时才发现天快黑了。"
            )
        }
        6 { # 喝茶
            @(
                "$weather你泡了一壶野茶。茶汤金黄透亮，入口回甘。",
                "$weather你把新采的茶叶焙干。满屋都是炒茶的香气。",
                "$weather你在树下摆了一个茶席。席地而坐，慢慢品茶。",
                "$weather你给茶壶换了一泡新茶。第二泡的味道比第一泡更醇。",
                "$weather你喝了三杯茶，出了一层薄汗。浑身舒畅。",
                "$weather你尝了一口去年前自己做的茶。存了一年后，味道更醇厚了。",
                "$weather你端着茶碗在院子里踱步。一边走一边喝。",
                "$weather你在茶里加了一勺野蜂蜜。甜丝丝的，很好喝。"
            )
        }
        7 { # 打坐冥想
            @(
                "$weather你盘腿坐在大石上静坐。呼吸渐渐变得绵长。",
                "$weather你闭目打坐。山中的声音在耳边交织，却又觉得格外安静。",
                "$weather你在溪边静坐。水流声像一曲永不停歇的梵唱。",
                "$weather你坐在院子里冥想。不知不觉就是一个时辰。",
                "$weather你在竹林里找到一处安静的地方。坐下来，听风穿过竹叶。",
                "$weather你坐了很久，起身时腿有些麻。但心里很轻快。",
                "$weather你对着远处的山峦放空自己。什么也不想，什么也不做。",
                "$weather你在坐忘石上打坐。石头还留着太阳的余温。"
            )
        }
        8 { # 散步
            @(
                "$weather你沿着山路散步。路边的野花开得很好。",
                "$weather你走到山泉边。掬起一捧水洗了洗脸，清爽极了。",
                "$weather你绕着山谷走了一圈。出了一身薄汗。",
                "$weather你登上了附近的一座小山头。视野开阔，心胸也跟着开阔了。",
                "$weather你在林中漫步。脚下的落叶沙沙作响。",
                "$weather你沿着溪水往上走。发现了一个小瀑布。",
                "$weather你走了一条很久没走过的路。路都快被草木淹没了。",
                "$weather你在山路上遇到了几只野兔。它们看了你一眼，蹦跳着跑开了。"
            )
        }
        9 { # 看天气
            @(
                "$weather你抬头看天。云朵慢慢地移动，变幻出各种形状。",
                "$weather山里的天气变得真快。刚才还出着太阳，转眼就下起了雨。",
                "$weather你站在屋檐下看雨。雨丝细密，远处的山在雨中朦胧如画。",
                "$weather一场大雨过后，山间的空气格外清新。你深深吸了几口。",
                "$weather傍晚的云被染成了橘红色。明天应该是个好天气。",
                "$weather雾气从山谷中升起。整个山林都笼罩在白茫茫的雾中。",
                "$weather你看着远方的山峦。一层层地叠向天边。",
                "$weather今夜繁星满天。你在院子里站了很久，仰头看星星。"
            )
        }
        10 { # 修葺房屋
            @(
                "$weather你爬上屋顶，检查有没有漏雨的地方。换了几片瓦。",
                "$weather你用竹篾修补了院子的篱笆。密实多了。",
                "$weather你给窗户糊了一层新纸。屋里亮堂了不少。",
                "$weather你加固了凉亭的柱子。风吹来时不再嘎吱作响了。",
                "$weather你用泥土和稻草修补了墙上的裂缝。",
                "$weather你给门轴上了油。开门关门不再有吱呀声了。",
                "$weather你重新铺了院子里的石板路。踩上去更稳当了。",
                "$weather你在屋檐下钉了一个木板。用来挂工具和干菜。"
            )
        }
        11 { # 手工制作
            @(
                "$weather你用竹子编了一个篮子。手艺比以前好了不少。",
                "$weather你找了一块合适的木头，准备雕刻一个小物件。",
                "$weather你在石头上磨一根竹簪。磨得光滑圆润。",
                "$weather你用藤条编了一个壶垫。朴素但实用。",
                "$weather你把一根老竹子锯成几段。准备做几个竹杯。",
                "$weather你用麻绳编了一条腰带。结实耐用。",
                "$weather你在木头上刻了一个小葫芦。挂在门上当装饰。",
                "$weather你把碎布拼在一起，缝了一个香囊。里面装了干艾草。"
            )
        }
        12 { # 动物互动（不推进剧情）
            @(
                "$weather屋檐下有一只小麻雀在躲雨。你轻轻看了它一眼。",
                "$weather一只松鼠在院子里偷吃你晒的果干。你没有驱赶它。",
                "$weather你看到一只蝴蝶停在花上。翅膀一开一合。",
                "$weather山鸟在树枝上叫得正欢。你学着叫了一声，它们安静了片刻。",
                "$weather一只野猫从篱笆下钻进来。它看了你一眼，又钻了出去。",
                "$weather你在溪边看到一只青蛙蹲在石头上。鼓着腮帮子叫。",
                "$weather几只蚂蚁排成一队搬运食物。你蹲下来看了一会儿。",
                "$weather树上有只啄木鸟在笃笃地敲树干。声音在山谷中回荡。"
            )
        }
        13 { # 洗衣打扫
            @(
                "$weather你把被褥拿到院子里晒。阳光的味道很好闻。",
                "$weather你打扫了屋子。扫出一小堆灰尘。",
                "$weather你把衣服泡在木盆里。用皂角搓洗。",
                "$weather你整理了一下书架。把书按照大小重新排列。",
                "$weather你擦洗了桌子和椅子。地板也拖了一遍。",
                "$weather你把冬天的厚衣服翻出来晒。收起来等明年再穿。",
                "$weather你拆洗了被套。晾在竹竿上随风飘动。",
                "$weather你把碗筷洗得干干净净。摆放整齐。"
            )
        }
        14 { # 季节观察
            @(
                "$weather你注意到山上的树叶开始变黄了。秋天快到了。",
                "$weather路边开了一些不知名的小花。紫色的小花在风中摇曳。",
                "$weather你感觉到了季节的变化。空气中多了一丝凉意。",
                "$weather春天的气息越来越浓了。树枝上冒出了新芽。",
                "$weather夏天的蝉鸣声此起彼伏。你知道午后又将是一阵雷雨。",
                "$weather秋天到了。山上的柿子树挂满了果子。",
                "$weather冬天来了。你给菜地盖上了一层稻草防冻。",
                "$weather清晨的草地上结了一层白霜。踩上去嘎吱作响。"
            )
        }
        15 { # 访客往来
            @(
                "$weather山下有人上山来了。带了一包红糖。你们坐着聊了一会儿。",
                "$weather一个孩子上山来玩。你给了他一个刚摘的果子。",
                "$weather山下的老人托人带了一封信来。问你好不好。",
                "$weather有人上山来问路。你给他指了一条近道。",
                "$weather一个猎人在你这里歇脚。喝了一碗水后继续赶路了。",
                "$weather一个采药人在你屋前经过。你们交流了一下草药的用法。",
                "$weather一个老友带了一壶酒来看你。你们在凉亭里喝到日落。",
                "$weather村里的大婶上山来。给你带了一罐自家做的酱菜。"
            )
        }
        16 { # 日常杂务
            @(
                "$weather你整理了一下屋子。把不需要的杂物清理出去。",
                "$weather你清点了一下存粮。还够吃一阵子的。",
                "$weather你把工具房收拾了一遍。该擦的擦，该修的修。",
                "$weather你坐在门口缝补衣服。针脚走得又密又匀。",
                "$weather你给菜地松了松土。土质不错。",
                "$weather你把晒干的草药收进罐子里。密封好。",
                "$weather你磨了磨剪刀。又可以用了。",
                "$weather你把院子里的落叶扫成一堆。做堆肥用。"
            )
        }
        17 { # 夜晚时光
            @(
                "$weather你在灯下看书。油灯的光昏黄而温暖。",
                "$weather你坐在院子里看月亮。月色如水。",
                "$weather你躺在床上听雨声。雨打在屋顶上，像一首催眠曲。",
                "$weather你在灯下写字。写累了就吹灯睡了。",
                "$weather你坐在黑暗中。什么也不做，只是静静地坐着。",
                "$weather月光透过窗户洒在地上。你看着那片光，心中很平静。",
                "$weather你点了一炷香。青烟袅袅上升。",
                "$weather夜很深了。你听见猫头鹰的叫声从远处传来。"
            )
        }
        18 { # 水边活动
            @(
                "$weather你在溪边洗脚。溪水凉凉的，很舒服。",
                "$weather你在溪水里捡了几块好看的石头。准备放在书桌上。",
                "$weather你坐在溪边的大石上。把脚伸进水里。",
                "$weather你用竹筒接了一筒山泉水。喝起来清甜可口。",
                "$weather你在溪边的沙地上发现了一些动物脚印。",
                "$weather你蹲在水边洗手。水中的倒影随着波纹晃动。",
                "$weather你扔了一颗石子进溪水里。水花溅起又归于平静。",
                "$weather你沿着溪流走了一段。听着水声，心里很安静。"
            )
        }
        19 { # 竹林/树下
            @(
                "$weather你走到竹林里。风吹竹叶沙沙响。",
                "$weather你在老梅树下坐了一会儿。树皮粗糙而温暖。",
                "$weather你给银杏树浇了浇水。叶子在风中轻轻摆动。",
                "$weather你在树荫下打了一个盹。醒来时身上落了几片叶子。",
                "$weather你靠在树干上读书。阳光透过树叶洒下斑驳的光点。",
                "$weather竹林里冒出了几根新笋。你拔了两根准备晚上吃。",
                "$weather你坐在树下喝茶。风把一片叶子吹进了茶碗里。",
                "$weather你在树荫下铺了一张席子。躺下来看天空。"
            )
        }
        20 { # 厨艺
            @(
                "$weather你用新摘的蔬菜做了一顿素菜。清淡可口。",
                "$weather你煮了一锅绿豆汤。放凉了喝，解暑。",
                "$weather你试着做了一坛泡菜。希望过些日子能好吃。",
                "$weather你用面粉做了一碗面条。汤里加了些野菜。",
                "$weather你烤了几个饼。外酥里软。",
                "$weather你用蜂蜜腌了一些梅子。酸甜可口。",
                "$weather你煮了一锅腊八粥。各种豆子混在一起，很香。",
                "$weather你试着做豆腐。虽然不太成功，但味道还行。"
            )
        }
        21 { # 山中观察
            @(
                "$weather你注意到山上的野花又开了几种。山里总是有看不完的景致。",
                "$weather你看到远山上的云雾变幻。时而像马，时而像龙。",
                "$weather你发现了一条以前没注意过的小路。路通向一片野果林。",
                "$weather你听到山谷中传来回音。你喊了一声，山回应了你。",
                "$weather你注意到溪水的水位比昨天低了一些。好几天没下雨了。",
                "$weather你看到一只鹰在山顶盘旋。飞得很高。",
                "$weather傍晚时分的天空颜色很美。你在院子里看了很久。",
                "$weather你数了数今天的鸟叫声。至少有五种不同的鸟。"
            )
        }
        22 { # 种树种花
            @(
                "$weather你在院子旁边种了几株花。希望它们能活下来。",
                "$weather你给新种的小树浇了水。叶子看起来挺精神的。",
                "$weather你把一株野花移栽到院子里。开了几朵小花。",
                "$weather你插了几根柳枝在溪边。也许它们会生根发芽。",
                "$weather你在屋后种了一圈蔷薇。等它们长大了一定很好看。",
                "$weather你把一些花种子撒在路边。等它们自己发芽。",
                "$weather你修剪了一下院子里的花枝。剪下来的枝条可以扦插。",
                "$weather你给花除了除草。花长得更好了。"
            )
        }
        23 { # 静坐发呆
            @(
                "$weather你什么也没做。只是坐在那里，感觉很好。",
                "$weather你靠在椅背上闭着眼睛。听着周围的声音。",
                "$weather你躺在竹椅上晒太阳。暖洋洋的，不想动弹。",
                "$weather你坐在门槛上发呆。一只蚂蚁从你脚边爬过。",
                "$weather你趴在窗台上看外面的风景。山还是那座山。",
                "$weather你坐在凉亭里，手边放着一杯已经凉了的茶。",
                "$weather你仰头看着屋檐下的蜘蛛网。露珠在蛛网上闪闪发光。",
                "$weather你什么也不想做。今天就懒一会儿。"
            )
        }
        24 { # 其他杂事
            @(
                "$weather你把一些旧衣服改成了抹布。用得上。",
                "$weather你整理了药箱。补充了一些常用的药材。",
                "$weather你给菜地施了肥。用的是自制的堆肥。",
                "$weather你把厨房里的瓶瓶罐罐擦干净。重新摆放整齐。",
                "$weather你把冬天的被褥拿出来晒了晒。收了满满的阳光味。",
                "$weather你清理了屋檐下的蜘蛛网。蜘蛛又找地方重新织了。",
                "$weather你把炉灰清理出来。添了新柴。",
                "$weather你给门窗上了漆。看起来焕然一新。"
            )
        }
    }
}

# 计算每个等级的 filler 事件数
function Get-FillerCountForLevel {
    param($level)
    
    if ($level -le 30) { return 0 }
    elseif ($level -le 50) { return 1 }  # 31-50: 1 per level = 20
    elseif ($level -le 100) {
        # 51-100: gradually 1 to 3 per level (avg ~2)
        $progress = ($level - 50) / 50.0  # 0 to 1
        return [math]::Round(1 + $progress * 2)
    }
    elseif ($level -le 200) {
        # 101-200: gradually 3 to 6 per level (avg ~4.5)
        $progress = ($level - 100) / 100.0  # 0 to 1
        return [math]::Round(3 + $progress * 3)
    }
    elseif ($level -le 300) {
        # 201-300: gradually 6 to 10 per level (avg ~8)
        $progress = ($level - 200) / 100.0
        return [math]::Round(6 + $progress * 4)
    }
    elseif ($level -le 400) {
        # 301-400: gradually 10 to 13 per level (avg ~11.5)
        $progress = ($level - 300) / 100.0
        return [math]::Round(10 + $progress * 3)
    }
    else {
        # 401-500: gradually 13 to 16 per level (avg ~14.5)
        $progress = ($level - 400) / 100.0
        return [math]::Round(13 + $progress * 3)
    }
}

# 生成 filler 事件
$fillerLines = @()
$globalIndex = 0

for ($level = 1; $level -le 500; $level++) {
    $count = Get-FillerCountForLevel -level $level
    for ($j = 0; $j -lt $count; $j++) {
        $fillId = 501 + $globalIndex  # 从 h_e0501 开始
        $fillIdStr = "h_e{0:D4}" -f $fillId
        
        # 不同 index 对应不同的文本
        $text = Get-FillerText -level $level -index ($globalIndex * 7 + $j * 13)
        
        $fillerLines += "| $fillIdStr | filler | $level | 0 | 1 | 是 | $text |"
        $globalIndex++
    }
}

Write-Host "生成了 $globalIndex 条 filler 事件"

# 添加 filler 事件到输出
$output += ""
$output += $fillerLines
$output += ""

# ===== 5. 添加 Achievements（保持不变）=====
for ($i = $achievementsStart; $i -lt $holidayStart - 1; $i++) {
    $output += $lines[$i]
}
$output += ""

# ===== 6. 添加 HolidayEvents（保持不变）=====
for ($i = $holidayStart; $i -lt $lines.Length; $i++) {
    $output += $lines[$i]
}

# ===== 写入文件 =====
$output | Set-Content -Path $filePath -Encoding UTF8
Write-Host "文件已写入: $filePath"
Write-Host "输出总行数: $($output.Count)"
