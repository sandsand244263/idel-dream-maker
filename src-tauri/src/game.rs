use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioProgress {
    pub total_exp_earned: f64,
    pub total_runtime_ms: u64,
    pub triggered_events: Vec<String>,
    pub unlocked_achievements: Vec<String>,
    pub equipped_title_index: usize,
}
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;

use crate::scenario;
use crate::scenario::Scenario;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub player_name: String,
    pub scenario_id: String,
    pub level: u64,
    pub exp: f64,
    pub total_exp_earned: f64,
    pub total_runtime_ms: u64,
    pub last_save_time: u64,
    pub equipped_title_index: usize,
    pub triggered_events: Vec<String>,
    pub unlocked_achievements: Vec<String>,
    pub selected_font_theme: String,
    #[serde(default)]
    pub is_in_hub: bool,
    #[serde(default)]
    pub hub_total_exp: f64,
    #[serde(default)]
    pub scenario_alias: String,
    #[serde(default)]
    pub unlocked_title_sets: HashMap<String, Vec<String>>,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub ai_output_language: String,
    #[serde(default)]
    pub scenario_progress: HashMap<String, ScenarioProgress>,
}

impl Default for GameState {
    fn default() -> Self {
        Self {
            player_name: "Worker".to_string(),
            scenario_id: "wasteland".to_string(),
            level: 1,
            exp: 0.0,
            total_exp_earned: 0.0,
            total_runtime_ms: 0,
            last_save_time: Utc::now().timestamp_millis() as u64,
            equipped_title_index: 0,
            triggered_events: Vec::new(),
            unlocked_achievements: Vec::new(),
            selected_font_theme: "green".to_string(),
            is_in_hub: true,
            hub_total_exp: 0.0,
            scenario_alias: String::new(),
            unlocked_title_sets: HashMap::new(),
            language: "zh".to_string(),
            ai_output_language: "zh".to_string(),
            scenario_progress: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct GameTickPayload {
    pub exp: f64,
    pub level: u64,
    pub total_exp_earned: f64,
    pub total_runtime_ms: u64,
    pub equipped_title_index: usize,
}

impl From<&GameState> for GameTickPayload {
    fn from(s: &GameState) -> Self {
        Self {
            exp: s.exp,
            level: s.level,
            total_exp_earned: s.total_exp_earned,
            total_runtime_ms: s.total_runtime_ms,
            equipped_title_index: s.equipped_title_index,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct EventTriggeredPayload {
    pub id: String,
    pub text: String,
    pub title: String,
    pub color: String,
}

fn get_save_path(app_handle: &AppHandle) -> PathBuf {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    app_dir.join("save.json")
}

pub fn load_save(app_handle: &AppHandle) -> Option<GameState> {
    let path = get_save_path(app_handle);
    if path.exists() {
        let content = std::fs::read_to_string(path).ok()?;
        serde_json::from_str(&content).ok()
    } else {
        None
    }
}

pub fn save_game(app_handle: &AppHandle, state: &GameState) {
    let path = get_save_path(app_handle);
    let content = serde_json::to_string_pretty(state).expect("failed to serialize save");
    std::fs::write(path, content).expect("failed to write save file");
}

pub struct AppState {
    pub game: std::sync::Mutex<GameState>,
    pub scenario: std::sync::Mutex<Scenario>,
    pub all_scenarios: Vec<Scenario>,
}

pub fn start_game_loop(app_handle: AppHandle) {
    std::thread::spawn(move || {
        let mut last_save = std::time::Instant::now();
        let mut last_event_check = std::time::Instant::now();
        let mut last_tick_emit = std::time::Instant::now();
        loop {
            std::thread::sleep(std::time::Duration::from_millis(500));

            let state = app_handle.state::<AppState>();
            let mut game = match state.game.lock() {
                Ok(g) => g,
                Err(_) => continue,
            };

            if game.is_in_hub {
                if last_tick_emit.elapsed() >= std::time::Duration::from_secs(1) {
                    let payload = GameTickPayload::from(&*game);
                    app_handle.emit("game-tick", payload).ok();
                    last_tick_emit = std::time::Instant::now();
                }
                if last_save.elapsed() >= std::time::Duration::from_secs(30) {
                    game.last_save_time = chrono::Utc::now().timestamp_millis() as u64;
                    save_game(&app_handle, &game);
                    last_save = std::time::Instant::now();
                }
                continue;
            }

            game.exp += 1.0;
            game.total_exp_earned += 1.0;
            game.total_runtime_ms += 1000;

            let new_level = scenario::calculate_level(game.total_exp_earned);
            if new_level > game.level {
                game.level = new_level;
                let scenario = state.scenario.lock().unwrap();
                let title = scenario::get_current_title(&scenario, game.level);
                app_handle
                    .emit("level-up", serde_json::json!({
                        "level": game.level,
                        "title": title.name,
                        "titleColor": title.color,
                        "titleDesc": title.desc,
                    }))
                    .ok();
            }

            if last_tick_emit.elapsed() >= std::time::Duration::from_secs(1) {
                let payload = GameTickPayload::from(&*game);
                app_handle.emit("game-tick", payload).ok();
                last_tick_emit = std::time::Instant::now();
            }

            if last_event_check.elapsed() >= std::time::Duration::from_secs(60) {
                let scenario = state.scenario.lock().unwrap();
                check_and_trigger_event(&app_handle, &mut game, &scenario);
                last_event_check = std::time::Instant::now();
            }

            let scenario = state.scenario.lock().unwrap();
            check_achievements(&app_handle, &mut game, &scenario);
            drop(scenario);

            if last_save.elapsed() >= std::time::Duration::from_secs(30) {
                game.last_save_time = chrono::Utc::now().timestamp_millis() as u64;
                save_game(&app_handle, &game);
                last_save = std::time::Instant::now();
            }
        }
    });
}

pub fn reset_game_for_scenario(game: &mut GameState, scenario: &Scenario, alias: &str) {
    game.scenario_id = scenario.id.clone();
    game.exp = 0.0;
    game.is_in_hub = false;
    game.scenario_alias = alias.to_string();

    if let Some(p) = game.scenario_progress.get(&scenario.id) {
        game.total_exp_earned = p.total_exp_earned;
        game.level = scenario::calculate_level(p.total_exp_earned);
        game.total_runtime_ms = p.total_runtime_ms;
        game.equipped_title_index = p.equipped_title_index;
        game.triggered_events = p.triggered_events.clone();
        game.unlocked_achievements = p.unlocked_achievements.clone();
    } else {
        game.level = 1;
        game.total_exp_earned = 0.0;
        game.total_runtime_ms = 0;
        game.equipped_title_index = 0;
        game.triggered_events.clear();
        game.unlocked_achievements.clear();
    }
}

pub fn exit_to_hub(game: &mut GameState) {
    if !game.scenario_id.is_empty() {
        let p = ScenarioProgress {
            total_exp_earned: game.total_exp_earned,
            total_runtime_ms: game.total_runtime_ms,
            triggered_events: game.triggered_events.clone(),
            unlocked_achievements: game.unlocked_achievements.clone(),
            equipped_title_index: game.equipped_title_index,
        };
        game.scenario_progress.insert(game.scenario_id.clone(), p);
    }
    game.hub_total_exp += game.total_exp_earned;
    game.scenario_id.clear();
    game.level = 1;
    game.exp = 0.0;
    game.total_exp_earned = 0.0;
    game.total_runtime_ms = 0;
    game.equipped_title_index = 0;
    game.triggered_events.clear();
    game.unlocked_achievements.clear();
    game.scenario_alias.clear();
    game.is_in_hub = true;
}

fn check_and_trigger_event(
    app_handle: &AppHandle,
    game: &mut GameState,
    scenario: &Scenario,
) {
    use rand::Rng;

    let runtime_hours = game.total_runtime_ms as f64 / 3_600_000.0;

    let trigger_chance = if runtime_hours < 12.0 {
        0.4
    } else if runtime_hours < 72.0 {
        0.3
    } else {
        0.15
    };

    let mut rng = rand::thread_rng();
    if rng.r#gen::<f64>() >= trigger_chance {
        return;
    }

    let available: Vec<&scenario::EventDef> = scenario
        .events
        .iter()
        .filter(|e| {
            e.min_level <= game.level
                && e.min_hours <= runtime_hours as u64
                && (!e.once || !game.triggered_events.contains(&e.id))
        })
        .collect();

    if available.is_empty() {
        return;
    }

    let total_weight: u32 = available.iter().map(|e| e.weight).sum();
    let roll = rng.gen_range(0..total_weight);
    let mut cumulative = 0;
    let chosen = available.iter().find(|e| {
        cumulative += e.weight;
        roll < cumulative
    });

    if let Some(event) = chosen {
        if event.once {
            game.triggered_events.push(event.id.clone());
        }

        let title = scenario::get_current_title(scenario, game.level);

        app_handle
            .emit(
                "event-triggered",
                EventTriggeredPayload {
                    id: event.id.clone(),
                    text: event.text.clone(),
                    title: title.name.clone(),
                    color: title.color.clone(),
                },
            )
            .ok();

        // Tray tooltip is updated via frontend invoke, not from game loop
    }
}

fn check_achievements(
    app_handle: &AppHandle,
    game: &mut GameState,
    scenario: &Scenario,
) {
    for achievement in &scenario.achievements {
        if game.unlocked_achievements.contains(&achievement.id) {
            continue;
        }

        let unlocked = match &achievement.condition {
            scenario::AchievementCondition::Level(req) => game.level >= *req,
            scenario::AchievementCondition::Runtime(req) => game.total_runtime_ms >= *req,
            scenario::AchievementCondition::EventsCollected(req) => {
                game.triggered_events.len() as u64 >= *req
            }
            scenario::AchievementCondition::TitleCount(req) => {
                scenario::get_unlocked_titles(scenario, game.level).len() as u64 >= *req
            }
        };

        if unlocked {
            game.unlocked_achievements.push(achievement.id.clone());
            app_handle
                .emit(
                    "achievement-unlocked",
                    serde_json::json!({
                        "id": achievement.id,
                        "name": achievement.name,
                        "desc": achievement.desc,
                        "icon": achievement.icon,
                    }),
                )
                .ok();

            // Tray tooltip for achievement is handled by frontend
        }
    }
}
