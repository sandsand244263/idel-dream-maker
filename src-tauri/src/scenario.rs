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
