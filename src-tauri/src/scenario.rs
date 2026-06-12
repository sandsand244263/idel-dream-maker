use serde::{Deserialize, Serialize};

// 引入构建时生成的二进制场景数据
include!(concat!(env!("OUT_DIR"), "/scenarios_data.rs"));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    pub id: String,
    pub name: String,
    #[serde(rename = "nameCN")]
    pub name_cn: String,
    pub description: String,
    #[serde(rename = "playerTitle")]
    pub player_title: String,
    pub titles: Vec<TitleDef>,
    pub events: Vec<EventDef>,
    pub achievements: Vec<AchievementDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitleDef {
    pub level: u64,
    pub name: String,
    pub color: String,
    pub desc: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventDef {
    pub id: String,
    #[serde(rename = "minLevel")]
    pub min_level: u64,
    #[serde(rename = "minHours")]
    pub min_hours: u64,
    pub weight: u32,
    pub once: bool,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AchievementDef {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub icon: String,
    pub condition: AchievementCondition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum AchievementCondition {
    #[serde(rename = "level")]
    Level(u64),
    #[serde(rename = "runtime")]
    Runtime(u64),
    #[serde(rename = "events")]
    EventsCollected(u64),
    #[serde(rename = "titles")]
    TitleCount(u64),
}

pub fn load_all_scenarios() -> Vec<Scenario> {
    ALL_SCENARIO_DATA
        .iter()
        .map(|data| {
            bincode::deserialize(data).expect("Failed to deserialize scenario data")
        })
        .collect()
}

pub fn find_scenario_by_id<'a>(scenarios: &'a [Scenario], id: &str) -> Option<&'a Scenario> {
    scenarios.iter().find(|s| s.id == id)
}

pub fn get_current_title(scenario: &Scenario, level: u64) -> &TitleDef {
    let mut best = &scenario.titles[0];
    for title in &scenario.titles {
        if title.level <= level {
            best = title;
        } else {
            break;
        }
    }
    best
}

pub fn get_unlocked_titles<'a>(scenario: &'a Scenario, level: u64) -> Vec<&'a TitleDef> {
    scenario.titles.iter().filter(|t| t.level <= level).collect()
}

pub fn calculate_level(total_exp_earned: f64) -> u64 {
    if total_exp_earned <= 0.0 {
        return 1;
    }
    ((total_exp_earned / 100.0).sqrt().floor() as u64) + 1
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_scenario() -> Scenario {
        Scenario {
            id: "test".into(),
            name: "Test".into(),
            name_cn: "测试".into(),
            description: "test".into(),
            player_title: "新手".into(),
            titles: vec![
                TitleDef { level: 1,  name: "新手".into(),   color: "#888".into(), desc: "起步".into() },
                TitleDef { level: 5,  name: "熟练".into(),   color: "#aaa".into(), desc: "熟练了".into() },
                TitleDef { level: 10, name: "专家".into(),   color: "#0f0".into(), desc: "成专家了".into() },
                TitleDef { level: 20, name: "大师".into(),   color: "#ff0".into(), desc: "达到大师".into() },
                TitleDef { level: 50, name: "传说".into(),   color: "#f00".into(), desc: "成为传说".into() },
            ],
            events: vec![
                EventDef { id: "t_e001".into(), min_level: 1,  min_hours: 0,  weight: 10, once: true,  text: "初次事件，只触发一次".into() },
                EventDef { id: "t_e002".into(), min_level: 1,  min_hours: 0,  weight: 5,  once: false, text: "普通事件".into() },
                EventDef { id: "t_e003".into(), min_level: 5,  min_hours: 2,  weight: 3,  once: false, text: "需要 5 级 2 小时".into() },
                EventDef { id: "t_e004".into(), min_level: 10, min_hours: 5,  weight: 1,  once: true,  text: "需要 10 级 5 小时，一次".into() },
            ],
            achievements: vec![
                AchievementDef { id: "ta_level5".into(),  name: "新手毕业".into(), desc: "达到 Lv.5".into(),   icon: "★".into(), condition: AchievementCondition::Level(5) },
                AchievementDef { id: "ta_runtime1h".into(), name: "一小时".into(), desc: "运行 1 小时".into(), icon: "⏱".into(), condition: AchievementCondition::Runtime(3_600_000) },
                AchievementDef { id: "ta_events2".into(), name: "两件事".into(), desc: "触发 2 个事件".into(), icon: "📖".into(), condition: AchievementCondition::EventsCollected(2) },
                AchievementDef { id: "ta_titles2".into(), name: "两个称号".into(), desc: "解锁 2 个称号".into(), icon: "🏅".into(), condition: AchievementCondition::TitleCount(2) },
            ],
        }
    }

    // ── Test 1: 等级计算 ──

    #[test]
    fn test_level_calculation() {
        assert_eq!(calculate_level(0.0), 1, "0 exp 应为 Lv.1");
        assert_eq!(calculate_level(50.0), 1, "50 exp 应为 Lv.1");
        assert_eq!(calculate_level(100.0), 2, "100 exp 应为 Lv.2");
        assert_eq!(calculate_level(399.0), 2, "399 exp 应为 Lv.2");
        assert_eq!(calculate_level(400.0), 3, "400 exp 应为 Lv.3");
        assert_eq!(calculate_level(10_000.0), 11, "10000 exp 应为 Lv.11");
        assert_eq!(calculate_level(2_500_000.0), 159, "2500000 exp 应为 Lv.159");
    }

    // ── Test 2: 称号查找 ──

    #[test]
    fn test_title_lookup() {
        let s = test_scenario();

        let t1 = get_current_title(&s, 1);
        assert_eq!(t1.name, "新手", "Lv.1 称号");

        let t2 = get_current_title(&s, 2);
        assert_eq!(t2.name, "新手", "Lv.2 仍在 Lv.1 称号");

        let t3 = get_current_title(&s, 5);
        assert_eq!(t3.name, "熟练", "Lv.5 称号");

        let t4 = get_current_title(&s, 10);
        assert_eq!(t4.name, "专家", "Lv.10 称号");

        let t5 = get_current_title(&s, 100);
        assert_eq!(t5.name, "传说", "Lv.100 最高称号");
    }

    #[test]
    fn test_unlocked_titles() {
        let s = test_scenario();

        let ul1 = get_unlocked_titles(&s, 1);
        assert_eq!(ul1.len(), 1, "Lv.1 解锁 1 个称号");

        let ul2 = get_unlocked_titles(&s, 5);
        assert_eq!(ul2.len(), 2, "Lv.5 解锁 2 个称号");

        let ul3 = get_unlocked_titles(&s, 50);
        assert_eq!(ul3.len(), 5, "Lv.50 解锁全部 5 个称号");
    }

    // ── Test 3: 事件过滤 + once 逻辑 ──

    #[test]
    fn test_event_filtering() {
        let s = test_scenario();
        let _empty_triggered: Vec<String> = vec![];

        // level 1, runtime 0h
        let avail1: Vec<&EventDef> = s.events.iter()
            .filter(|e| e.min_level <= 1 && e.min_hours <= 0)
            .collect();
        assert_eq!(avail1.len(), 2, "Lv.1/0h 应可用 2 个事件");

        // level 10, runtime 5h
        let avail2: Vec<&EventDef> = s.events.iter()
            .filter(|e| e.min_level <= 10 && e.min_hours <= 5)
            .collect();
        assert_eq!(avail2.len(), 4, "Lv.10/5h 全部事件可用");
    }

    #[test]
    fn test_once_event_not_repeatable() {
        let s = test_scenario();
        let triggered = vec!["t_e001".to_string()]; // 已触发 once 事件

        let repeatable: Vec<&EventDef> = s.events.iter()
            .filter(|e| !e.once || !triggered.contains(&e.id))
            .collect();

        // once 事件 t_e001 被排除，但 t_e004 还在（未触发过）
        assert_eq!(repeatable.len(), 3, "1 个 once 已触发，剩 3 个");
    }

    // ── Test 4: 成就检测 ──

    #[test]
    fn test_achievement_level() {
        let s = test_scenario();
        let ach = &s.achievements[0]; // ta_level5: Level(5)
        assert!(matches!(ach.condition, AchievementCondition::Level(5)));

        // Lv.5 时应该解锁
        let unlocked_lv4 = match &ach.condition {
            AchievementCondition::Level(req) => 4 >= *req,
            _ => false,
        };
        assert!(!unlocked_lv4, "Lv.4 不应解锁 Lv.5 成就");

        let unlocked_lv5 = match &ach.condition {
            AchievementCondition::Level(req) => 5 >= *req,
            _ => false,
        };
        assert!(unlocked_lv5, "Lv.5 应解锁 Lv.5 成就");
    }

    #[test]
    fn test_achievement_runtime() {
        let s = test_scenario();
        let ach = &s.achievements[1]; // ta_runtime1h: Runtime(3600000)

        let unlocked_before = match &ach.condition {
            AchievementCondition::Runtime(req) => 1_800_000 >= *req,
            _ => false,
        };
        assert!(!unlocked_before, "30 分钟不应解锁 1 小时成就");

        let unlocked_after = match &ach.condition {
            AchievementCondition::Runtime(req) => 3_600_000 >= *req,
            _ => false,
        };
        assert!(unlocked_after, "1 小时应解锁");
    }

    #[test]
    fn test_achievement_events_collected() {
        let s = test_scenario();
        let ach = &s.achievements[2]; // ta_events2: EventsCollected(2)

        let unlocked = match &ach.condition {
            AchievementCondition::EventsCollected(req) => 2 >= *req,
            _ => false,
        };
        assert!(unlocked, "2 个事件满足 2 事件成就");
    }

    #[test]
    fn test_achievement_title_count() {
        let s = test_scenario();
        let ach = &s.achievements[3]; // ta_titles2: TitleCount(2)

        let unlocked_titles = get_unlocked_titles(&s, 3); // Lv.3: 新手 + (无,因为下一个是 Lv.5)
        // Lv.3 只解锁了 "新手"(Lv.1)
        let ul_count = unlocked_titles.len() as u64;
        let unlocked = match &ach.condition {
            AchievementCondition::TitleCount(req) => ul_count >= *req,
            _ => false,
        };
        assert!(!unlocked, "Lv.3 只有 1 个称号，不应解锁 2 称号成就");

        let unlocked_titles2 = get_unlocked_titles(&s, 5); // Lv.5: 新手 + 熟练
        let ul_count2 = unlocked_titles2.len() as u64;
        let unlocked2 = match &ach.condition {
            AchievementCondition::TitleCount(req) => ul_count2 >= *req,
            _ => false,
        };
        assert!(unlocked2, "Lv.5 有 2 个称号，应解锁");
    }
}
