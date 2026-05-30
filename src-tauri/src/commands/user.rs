use crate::{AppState, AppError};
use crate::models::user::User;
use crate::auth::password::hash_password;
use crate::auth::session::destroy_all_sessions_for_user;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct NewUser {
    pub full_name: String,
    pub email: Option<String>,
    pub role: String,
    pub branch: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUser {
    pub id: i64,
    pub full_name: String,
    pub email: Option<String>,
    pub role: String,
    pub branch: Option<String>,
    pub status: String,
}

#[tauri::command]
pub async fn get_users(state: tauri::State<'_, AppState>) -> Result<Vec<User>, AppError> {
    let users = sqlx::query_as::<_, User>(
        "SELECT id, full_name, email, password_hash, role, branch, status, created_at, updated_at
         FROM rts_users ORDER BY full_name"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(users)
}

#[tauri::command]
pub async fn get_user(
    state: tauri::State<'_, AppState>,
    id: i64,
) -> Result<Option<User>, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, full_name, email, password_hash, role, branch, status, created_at, updated_at
         FROM rts_users WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?;
    Ok(user)
}

#[tauri::command]
pub async fn create_user(
    state: tauri::State<'_, AppState>,
    req: NewUser,
) -> Result<i64, AppError> {
    let result = sqlx::query(
        "INSERT INTO rts_users (full_name, email, role, branch, status)
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&req.full_name)
    .bind(&req.email)
    .bind(&req.role)
    .bind(&req.branch)
    .bind(req.status.as_deref().unwrap_or("active"))
    .execute(&state.db)
    .await?;

    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn update_user(
    state: tauri::State<'_, AppState>,
    req: UpdateUser,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE rts_users SET full_name = ?, email = ?, role = ?, branch = ?, status = ?, updated_at = datetime('now')
         WHERE id = ?"
    )
    .bind(&req.full_name)
    .bind(&req.email)
    .bind(&req.role)
    .bind(&req.branch)
    .bind(&req.status)
    .bind(req.id)
    .execute(&state.db)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_user(
    state: tauri::State<'_, AppState>,
    id: i64,
) -> Result<(), AppError> {
    destroy_all_sessions_for_user(&state.db, id).await?;
    sqlx::query("DELETE FROM rts_users WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub user_id: i64,
    pub new_password: String,
}

#[tauri::command]
pub async fn reset_user_password(
    state: tauri::State<'_, AppState>,
    req: ResetPasswordRequest,
) -> Result<(), AppError> {
    let hash = hash_password(&req.new_password)?;
    sqlx::query("UPDATE rts_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(&hash)
        .bind(req.user_id)
        .execute(&state.db)
        .await?;
    destroy_all_sessions_for_user(&state.db, req.user_id).await?;
    Ok(())
}
