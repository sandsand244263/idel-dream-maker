mod game;
mod scenario;

use game::{AppState, GameState, reset_game_for_scenario, start_game_loop, save_game, load_save, exit_to_hub};
use scenario::{load_all_scenarios, get_current_title, get_unlocked_titles, find_scenario_by_id};

use std::sync::Mutex;
use tauri::{Manager, AppHandle, State, WindowEvent};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
use tauri::menu::{MenuBuilder, MenuItemBuilder};

// ── Tauri Commands ──

#[tauri::command]
fn get_game_state(state: State<AppState>) -> Result<GameState, String> {
    state.game.lock().map(|g| g.clone()).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_full_state(state: State<AppState>) -> Result<serde_json::Value, String> {
    let game = state.game.lock().map_err(|e| e.to_string())?;
    let scenario = state.scenario.lock().map_err(|e| e.to_string())?;
    let current_title = get_current_title(&scenario, game.level);

    let hub_level = scenario::calculate_level(game.hub_total_exp);

    Ok(serde_json::json!({
        "game": &*game,
        "hubLevel": hub_level,
        "scenario": {
            "id": scenario.id,
            "name": scenario.name,
            "nameCN": scenario.name_cn,
            "description": scenario.description,
            "playerTitle": scenario.player_title,
        },
        "currentTitle": {
            "name": current_title.name,
            "color": current_title.color,
            "desc": current_title.desc,
        },
        "unlockedTitles": get_unlocked_titles(&scenario, game.level).iter().map(|t| {
            serde_json::json!({
                "name": t.name,
                "color": t.color,
                "desc": t.desc,
                "level": t.level,
            })
        }).collect::<Vec<_>>(),
    }))
}

#[tauri::command]
fn get_scenario_list(state: State<AppState>) -> Vec<serde_json::Value> {
    state.all_scenarios.iter().map(|s| {
        serde_json::json!({
            "id": s.id,
            "name": s.name,
            "nameCN": s.name_cn,
            "description": s.description,
            "playerTitle": s.player_title,
            "titleCount": s.titles.len(),
            "eventCount": s.events.len(),
            "achievementCount": s.achievements.len(),
        })
    }).collect()
}

#[tauri::command]
fn set_player_name(name: String, state: State<AppState>) -> Result<(), String> {
    let mut game = state.game.lock().map_err(|e| e.to_string())?;
    game.player_name = name;
    Ok(())
}

#[tauri::command]
fn select_scenario(id: String, alias: Option<String>, app: AppHandle, state: State<AppState>) -> Result<serde_json::Value, String> {
    let scenario = find_scenario_by_id(&state.all_scenarios, &id)
        .ok_or_else(|| format!("Scenario '{}' not found", id))?
        .clone();

    let alias = alias.unwrap_or_default();
    let mut game = state.game.lock().map_err(|e| e.to_string())?;
    reset_game_for_scenario(&mut game, &scenario, &alias);

    let mut scenario_lock = state.scenario.lock().map_err(|e| e.to_string())?;
    *scenario_lock = scenario.clone();
    drop(scenario_lock);

    save_game(&app, &game);

    Ok(serde_json::json!({
        "scenario": {
            "id": scenario.id,
            "name": scenario.name,
            "nameCN": scenario.name_cn,
            "description": scenario.description,
            "playerTitle": scenario.player_title,
        },
        "game": &*state.game.lock().map_err(|e| e.to_string())?,
    }))
}

#[tauri::command]
fn draw_scenario(state: State<AppState>) -> Result<serde_json::Value, String> {
    use rand::Rng;
    let scenarios = &state.all_scenarios;
    if scenarios.is_empty() {
        return Err("No scenarios available".to_string());
    }
    let idx = rand::thread_rng().r#gen_range(0..scenarios.len());
    let s = &scenarios[idx];
    Ok(serde_json::json!({
        "id": s.id,
        "name": s.name,
        "nameCN": s.name_cn,
        "description": s.description,
        "playerTitle": s.player_title,
    }))
}

#[tauri::command]
fn exit_to_hub_cmd(app: AppHandle, state: State<AppState>) -> Result<serde_json::Value, String> {
    let mut game = state.game.lock().map_err(|e| e.to_string())?;
    let scenario = state.scenario.lock().map_err(|e| e.to_string())?;
    let unlocked: Vec<String> = scenario.titles.iter()
        .filter(|t| t.level <= game.level)
        .map(|t| t.name.clone())
        .collect();
    let sid = game.scenario_id.clone();
    if !sid.is_empty() {
        game.unlocked_title_sets.insert(sid, unlocked);
    }
    drop(scenario);
    exit_to_hub(&mut game);
    save_game(&app, &game);

    let hub_level = scenario::calculate_level(game.hub_total_exp);
    Ok(serde_json::json!({
        "hubTotalExp": game.hub_total_exp,
        "hubLevel": hub_level,
    }))
}

#[tauri::command]
fn get_hub_titles(state: State<AppState>) -> Result<Vec<serde_json::Value>, String> {
    let game = state.game.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for s in &state.all_scenarios {
        let unlocked_titles = game.unlocked_title_sets.get(&s.id).cloned().unwrap_or_default();
        let total = s.titles.len();
        result.push(serde_json::json!({
            "id": s.id,
            "name": s.name,
            "nameCN": s.name_cn,
            "unlockedCount": unlocked_titles.len(),
            "totalCount": total,
            "unlockedTitles": unlocked_titles,
        }));
    }
    Ok(result)
}

#[tauri::command]
fn set_language(lang: String, state: State<AppState>) -> Result<(), String> {
    let mut game = state.game.lock().map_err(|e| e.to_string())?;
    game.language = lang;
    Ok(())
}

#[tauri::command]
fn set_ai_output_language(lang: String, state: State<AppState>) -> Result<(), String> {
    let mut game = state.game.lock().map_err(|e| e.to_string())?;
    game.ai_output_language = lang;
    Ok(())
}

#[tauri::command]
fn set_font_theme(theme: String, state: State<AppState>) -> Result<(), String> {
    let mut game = state.game.lock().map_err(|e| e.to_string())?;
    game.selected_font_theme = theme;
    Ok(())
}

#[tauri::command]
fn show_window(window: tauri::Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_window(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_window_mode(mode: String, window: tauri::Window) -> Result<(), String> {
    match mode.as_str() {
        "mini" => {
            window.set_decorations(false).map_err(|e| e.to_string())?;
            window.set_always_on_top(true).map_err(|e| e.to_string())?;
            window.set_size(tauri::LogicalSize::new(250, 80)).map_err(|e| e.to_string())?;
        }
        "full" => {
            window.set_decorations(true).map_err(|e| e.to_string())?;
            window.set_always_on_top(false).map_err(|e| e.to_string())?;
            window.set_size(tauri::LogicalSize::new(320, 840)).map_err(|e| e.to_string())?;
        }
        _ => {}
    }
    Ok(())
}

#[tauri::command]
fn set_window_position(x: i32, y: i32, window: tauri::Window) -> Result<(), String> {
    window.set_position(tauri::PhysicalPosition::new(x, y)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_scenario_detail(id: String, state: State<AppState>) -> Result<serde_json::Value, String> {
    let scenario = find_scenario_by_id(&state.all_scenarios, &id)
        .ok_or_else(|| format!("Scenario '{}' not found", id))?;

    Ok(serde_json::json!({
        "id": scenario.id,
        "name": scenario.name,
        "nameCN": scenario.name_cn,
        "description": scenario.description,
        "playerTitle": scenario.player_title,
        "titles": scenario.titles,
        "achievements": scenario.achievements,
    }))
}

// ── App Entry ──

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let scenarios = load_all_scenarios();
            let default_scenario = scenarios.first()
                .cloned()
                .expect("At least one scenario must be loaded");

            let game_state = load_save(app.handle()).unwrap_or_else(|| {
                let mut gs = GameState::default();
                gs.scenario_id = default_scenario.id.clone();
                gs
            });

            let initial_scenario_id = game_state.scenario_id.clone();
            let current_scenario = find_scenario_by_id(&scenarios, &initial_scenario_id)
                .cloned()
                .unwrap_or_else(|| default_scenario.clone());

            app.manage(AppState {
                game: Mutex::new(game_state),
                scenario: Mutex::new(current_scenario),
                all_scenarios: scenarios,
            });

            setup_tray(app)?;
            start_game_loop(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_game_state,
            get_full_state,
            get_scenario_list,
            set_player_name,
            select_scenario,
            exit_to_hub_cmd,
            draw_scenario,
            get_hub_titles,
            set_language,
            set_ai_output_language,
            set_font_theme,
            show_window,
            hide_window,
            set_window_mode,
            set_window_position,
            get_scenario_detail,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ── Tray Icon ──

fn setup_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItemBuilder::with_id("show", "Show/Hide")
        .build(app)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit")
        .build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show)
        .item(&separator)
        .item(&quit)
        .build()?;

    let icon_image = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))
        .expect("Failed to load tray icon");

    TrayIconBuilder::new()
        .icon(icon_image)
        .menu(&menu)
        .tooltip("Idel-DreamMaker")
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                "quit" => {
                    // Save before quitting
                    if let Some(state) = app.try_state::<AppState>() {
                        if let Ok(game) = state.game.lock() {
                            save_game(app, &game);
                        }
                    }
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}


