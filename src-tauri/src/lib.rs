use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, State, Window,
};
use serde::{Deserialize, Serialize};
use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use uuid::Uuid;

// -----------------------------------------------------------------------------
// Application State & Data Structures
// -----------------------------------------------------------------------------
pub struct AppSecurityState {
    pub gemini_api_key: Mutex<Option<String>>,
    pub epic_pkce_verifier: Mutex<Option<String>>,
    pub ballchasing_token: Mutex<Option<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GeminiStatusResponse {
    pub is_configured: bool,
    pub source: String,
    pub model: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StreamChunkEvent {
    pub chunk_text: String,
    pub is_final: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NativeSystemSpecs {
    pub os: String,
    pub target_arch: String,
    pub direct_input_polling_hz: u32,
    pub gsync_refresh_rate_hz: u32,
    pub webview2_runtime: String,
    pub appdata_path: String,
    pub temp_path: String,
    pub demo_dir_path: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HardwareProfile {
    pub machine_guid: String,
    pub cpu_processor_id: String,
    pub primary_gpu: String,
    pub display_refresh_hz: u32,
    pub direct_input_1000hz_capable: bool,
    pub fingerprint_hash: String,
    pub os_build: String,
    pub registered_user: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameLogInspection {
    pub log_path: String,
    pub exists: bool,
    pub file_size_bytes: u64,
    pub last_modified: String,
    pub process_status: String, // "RUNNING" | "IN_MATCH" | "OFFLINE"
    pub current_map: String,
    pub player_net_id: String,
    pub match_session_guid: String,
    pub server_tick_hz: u32,
    pub recent_events: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TempBuffersReport {
    pub base_temp_dir: String,
    pub ring_buffer_path: String,
    pub ring_buffer_size_bytes: usize,
    pub scratch_dir: String,
    pub ghub_stream_log: String,
    pub is_initialized: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GHubDeploymentResult {
    pub script_uuid: String,
    pub script_dir: String,
    pub script_file: String,
    pub settings_db_path: String,
    pub deployed_at: String,
    pub byte_size: usize,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LuaSyntaxError {
    pub line: usize,
    pub column: usize,
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LuaValidationReport {
    pub is_valid: bool,
    pub syntax_version: String,
    pub line_count: usize,
    pub errors: Vec<LuaSyntaxError>,
    pub warnings: Vec<String>,
    pub direct_input_1000hz_verified: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TelemetryTickRecord {
    pub session_id: String,
    pub tick_index: u64,
    pub scancode_hex: String,
    pub key_name: String,
    pub velocity_uu: f32,
    pub is_supersonic: bool,
    pub latency_us: u64,
    pub timestamp_epoch: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PythonEnvironmentInfo {
    pub is_available: bool,
    pub launcher_type: String, // "py", "python", "python3"
    pub version: String,
    pub executable_path: String,
    pub has_sqlite3: bool,
    pub has_numpy: bool,
    pub has_pandas: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ReplayFileEntry {
    pub file_name: String,
    pub file_path: String,
    pub size_bytes: u64,
    pub modified_timestamp: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LiquipediaRatingResponse {
    pub status: String,
    pub source: String,
    pub query_time: String,
    pub meta_data: serde_json::Value,
}

// -----------------------------------------------------------------------------
// Native Directory Helpers (%APPDATA%\FNProMasterEngine & %TEMP%\FNProMasterEngine)
// -----------------------------------------------------------------------------
pub fn get_fnpro_appdata_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let p = Path::new(&appdata).join("FNProMasterEngine");
        let _ = fs::create_dir_all(&p);
        return p;
    }
    let fallback = std::env::temp_dir().join("FNProMasterEngine_AppData");
    let _ = fs::create_dir_all(&fallback);
    fallback
}

pub fn get_fnpro_temp_dir() -> PathBuf {
    if let Ok(tmp) = std::env::var("TEMP") {
        let p = Path::new(&tmp).join("FNProMasterEngine");
        let _ = fs::create_dir_all(&p);
        return p;
    }
    let fallback = std::env::temp_dir().join("FNProMasterEngine");
    let _ = fs::create_dir_all(&fallback);
    fallback
}

pub fn get_vault_path() -> PathBuf {
    get_fnpro_appdata_dir().join("vault.key")
}

pub fn get_telemetry_db_path() -> PathBuf {
    get_fnpro_appdata_dir().join("fnpro_telemetry.db")
}

pub fn get_rocket_league_demo_dir() -> PathBuf {
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let p = Path::new(&user_profile)
            .join("Documents")
            .join("My Games")
            .join("Rocket League")
            .join("TAGame")
            .join("Demos");
        if p.exists() {
            return p;
        }
    }
    PathBuf::from("demos")
}

pub fn get_rocket_league_log_path() -> PathBuf {
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let p = Path::new(&user_profile)
            .join("Documents")
            .join("My Games")
            .join("Rocket League")
            .join("TAGame")
            .join("Logs")
            .join("Launch.log");
        return p;
    }
    PathBuf::from("Launch.log")
}

pub fn chrono_now_iso() -> String {
    let now = std::time::SystemTime::now();
    let dur = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("{}.{:03}Z", dur.as_secs(), dur.subsec_millis())
}

// -----------------------------------------------------------------------------
// Tauri Consolidated Commands Module (src-tauri/src/commands/mod.rs)
// -----------------------------------------------------------------------------
pub mod commands;

// -----------------------------------------------------------------------------
// Tauri App Builder Entry Point
// -----------------------------------------------------------------------------
pub fn run() {
    tauri::Builder::default()
        .manage(AppSecurityState {
            gemini_api_key: Mutex::new(None),
            epic_pkce_verifier: Mutex::new(None),
            ballchasing_token: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_hardware_fingerprint,
            commands::get_live_game_log_status,
            commands::init_temp_scratch_buffers,
            commands::deploy_ghub_lua_uuid,
            commands::detect_system_python,
            commands::validate_lua_script,
            commands::init_telemetry_db,
            commands::record_telemetry_tick,
            commands::save_ballchasing_token,
            commands::get_ballchasing_token,
            commands::fetch_ballchasing_replay_stats,
            commands::get_gemini_status,
            commands::set_gemini_api_key,
            commands::stream_gemini_generate,
            commands::get_system_specs,
            commands::load_native_config,
            commands::save_native_config,
            commands::load_native_presets,
            commands::save_native_presets,
            commands::launch_logitech_ghub,
            commands::launch_rocket_league,
            commands::list_native_replays,
            commands::parse_native_replay,
            commands::export_replay_telemetry_native,
            commands::fetch_liquipedia_meta,
            commands::start_epic_oauth_login,
            commands::exchange_epic_pkce_code,
            commands::generate_ghub_bipolar_lua_template
        ])
        .setup(|app| {
            let toggle_item = MenuItem::with_id(
                app,
                "toggle_window",
                "Show / Hide Console",
                true,
                None::<&str>,
            )?;
            let launch_rl_item = MenuItem::with_id(
                app,
                "launch_rl",
                "Launch Rocket League (DirectX 11)",
                true,
                None::<&str>,
            )?;
            let launch_ghub_item = MenuItem::with_id(
                app,
                "launch_ghub",
                "Launch Logitech G-HUB (1000Hz Engine)",
                true,
                None::<&str>,
            )?;
            let exit_item = MenuItem::with_id(
                app,
                "exit_app",
                "Exit Engine Completely",
                true,
                None::<&str>,
            )?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &toggle_item,
                    &launch_rl_item,
                    &launch_ghub_item,
                    &exit_item,
                ],
            )?;

            let tray_builder = TrayIconBuilder::new()
                .tooltip("FNPro Master Engine (1000Hz DirectInput)")
                .menu(&tray_menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "toggle_window" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        "launch_rl" => {
                            let _ = commands::launch_rocket_league();
                        }
                        "launch_ghub" => {
                            let _ = commands::launch_logitech_ghub();
                        }
                        "exit_app" => {
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
                });

            if let Some(icon) = app.default_window_icon() {
                let _ = tray_builder.icon(icon.clone()).build(app)?;
            } else {
                let _ = tray_builder.build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running FNPro Master Engine Tauri desktop application");
}
