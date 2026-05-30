use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use tauri::Manager;

pub async fn init_db(app: &tauri::AppHandle) -> Result<Pool<Sqlite>, sqlx::Error> {
    let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("thirdynal.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}
