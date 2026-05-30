pub mod commands;
pub mod db;
pub mod models;
pub mod services;
pub mod auth;
pub mod error;

use tauri::{Manager, Emitter};
use error::AppError;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::Pool<sqlx::Sqlite>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let rt = tokio::runtime::Runtime::new()?;
            let db = rt.block_on(db::init_db(app.handle()))?;
            app.manage(AppState { db });
            setup_menus(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth::login,
            commands::auth::logout,
            commands::auth::validate_session,
            commands::auth::change_password,
            // Users
            commands::user::get_users,
            commands::user::get_user,
            commands::user::create_user,
            commands::user::update_user,
            commands::user::delete_user,
            commands::user::reset_user_password,
            // RTS
            commands::rts::get_rts_records,
            commands::rts::get_rts_record,
            commands::rts::get_rts_record_by_waybill,
            commands::rts::save_rts_record,
            commands::rts::update_rts_record_status,
            commands::rts::delete_rts_record,
            commands::rts::get_rts_photos,
            commands::rts::save_rts_photo,
            commands::rts::upload_rts_photo,
            commands::rts::delete_rts_photo,
            commands::rts::add_rts_scan_log,
            commands::rts::get_rts_scan_logs,
            commands::rts::get_rts_stats,
            // Datasets / Analytics
            commands::dataset::save_legacy_dataset,
            commands::dataset::get_legacy_datasets,
            commands::dataset::delete_legacy_dataset,
            commands::dataset::save_analytics_dataset,
            commands::dataset::get_analytics_datasets,
            commands::dataset::get_analytics_dataset,
            commands::dataset::delete_analytics_dataset,
            commands::dataset::save_analytics_brand_data,
            commands::dataset::get_analytics_brand_data,
            commands::dataset::save_analytics_region_data,
            commands::dataset::get_analytics_region_data,
            commands::dataset::import_excel_dataset,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_menus(app: &tauri::AppHandle) -> Result<(), tauri::Error> {
    let menu = tauri::menu::MenuBuilder::new(app)
        .items(&[
            &tauri::menu::MenuItemBuilder::with_id("brand_trends", "Brand Trends")
                .accelerator("CmdOrCtrl+1")
                .build(app)?,
            &tauri::menu::MenuItemBuilder::with_id("by_region", "By Region Overall")
                .accelerator("CmdOrCtrl+2")
                .build(app)?,
            &tauri::menu::MenuItemBuilder::with_id("rts_scan", "RTS Scan")
                .accelerator("CmdOrCtrl+3")
                .build(app)?,
            &tauri::menu::MenuItemBuilder::with_id("rts_dashboard", "RTS Dashboard")
                .accelerator("CmdOrCtrl+4")
                .build(app)?,
            &tauri::menu::MenuItemBuilder::with_id("import_excel", "Import Monthly Excel")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
            &tauri::menu::MenuItemBuilder::with_id("export_backup", "Export Data Backup")
                .accelerator("CmdOrCtrl+S")
                .build(app)?,
        ])
        .build()?;

    let window = app.get_webview_window("main").unwrap();
    window.on_menu_event(move |window, event| {
        match event.id().0.as_str() {
            "brand_trends" => { let _ = window.emit("navigate", "/brand-trends"); }
            "by_region" => { let _ = window.emit("navigate", "/by-region"); }
            "rts_scan" => { let _ = window.emit("navigate", "/rts-scan"); }
            "rts_dashboard" => { let _ = window.emit("navigate", "/rts-dashboard"); }
            "import_excel" => { let _ = window.emit("menu-import-excel", ()); }
            "export_backup" => { let _ = window.emit("menu-export-backup", ()); }
            _ => {}
        }
    });

    app.set_menu(menu)?;
    Ok(())
}
