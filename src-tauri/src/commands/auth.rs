use crate::{AppState, AppError};
use crate::models::user::{SafeUser, User};
use crate::auth::password::{hash_password, verify_password};
use crate::auth::session::{create_session, destroy_session, validate_session as validate_session_impl};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub user: SafeUser,
    pub session_id: String,
}

#[tauri::command]
pub async fn login(
    state: tauri::State<'_, AppState>,
    req: LoginRequest,
) -> Result<LoginResponse, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, full_name, email, password_hash, role, branch, status, created_at, updated_at
         FROM rts_users WHERE LOWER(email) = LOWER(?) AND status = 'active'"
    )
    .bind(&req.email)
    .fetch_optional(&state.db)
    .await?;

    let user = user.ok_or_else(|| AppError::Auth("Invalid email or password".to_string()))?;

    // First login: no password set yet — set it now
    if user.password_hash.is_none() {
        let new_hash = hash_password(&req.password)?;
        sqlx::query("UPDATE rts_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(&new_hash)
            .bind(user.id)
            .execute(&state.db)
            .await?;
    } else if !verify_password(&req.password, user.password_hash.as_ref().unwrap())? {
        return Err(AppError::Auth("Invalid email or password".to_string()));
    }

    let session_id = create_session(&state.db, user.id, 7).await?;

    Ok(LoginResponse {
        user: SafeUser {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            branch: user.branch,
            status: user.status,
        },
        session_id,
    })
}

#[derive(Debug, Deserialize)]
pub struct LogoutRequest {
    pub session_id: String,
}

#[tauri::command]
pub async fn logout(
    state: tauri::State<'_, AppState>,
    req: LogoutRequest,
) -> Result<(), AppError> {
    destroy_session(&state.db, &req.session_id).await?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct ValidateSessionRequest {
    pub session_id: String,
}

#[tauri::command]
pub async fn validate_session(
    state: tauri::State<'_, AppState>,
    req: ValidateSessionRequest,
) -> Result<Option<SafeUser>, AppError> {
    validate_session_impl(&state.db, &req.session_id).await
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub user_id: i64,
    pub current_password: String,
    pub new_password: String,
}

#[tauri::command]
pub async fn change_password(
    state: tauri::State<'_, AppState>,
    req: ChangePasswordRequest,
) -> Result<(), AppError> {
    let row: Option<(Option<String>,)> = sqlx::query_as(
        "SELECT password_hash FROM rts_users WHERE id = ?"
    )
    .bind(req.user_id)
    .fetch_optional(&state.db)
    .await?;

    let (existing_hash,) = row.ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    if let Some(hash) = existing_hash {
        if !verify_password(&req.current_password, &hash)? {
            return Err(AppError::Auth("Current password is incorrect".to_string()));
        }
    }

    let new_hash = hash_password(&req.new_password)?;
    sqlx::query("UPDATE rts_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(&new_hash)
        .bind(req.user_id)
        .execute(&state.db)
        .await?;

    Ok(())
}
