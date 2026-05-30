use crate::error::AppError;
use crate::models::user::{SafeUser, User};
use sqlx::{Pool, Sqlite};
use rand::Rng;

pub fn generate_session_id() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    hex::encode(bytes)
}

pub async fn create_session(
    db: &Pool<Sqlite>,
    user_id: i64,
    days_valid: i64,
) -> Result<String, AppError> {
    let session_id = generate_session_id();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(days_valid);
    let expires_str = expires_at.to_rfc3339();

    sqlx::query("INSERT INTO rts_sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
        .bind(&session_id)
        .bind(user_id)
        .bind(&expires_str)
        .execute(db)
        .await?;

    Ok(session_id)
}

pub async fn validate_session(
    db: &Pool<Sqlite>,
    session_id: &str,
) -> Result<Option<SafeUser>, AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let row = sqlx::query_as::<_, User>(
        "SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.branch, u.status, u.created_at, u.updated_at
         FROM rts_sessions s
         JOIN rts_users u ON s.user_id = u.id
         WHERE s.id = ? AND s.expires_at > ? AND u.status = 'active'"
    )
    .bind(session_id)
    .bind(&now)
    .fetch_optional(db)
    .await?;

    Ok(row.map(|u| SafeUser {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        branch: u.branch,
        status: u.status,
    }))
}

pub async fn destroy_session(
    db: &Pool<Sqlite>,
    session_id: &str,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM rts_sessions WHERE id = ?")
        .bind(session_id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn destroy_all_sessions_for_user(
    db: &Pool<Sqlite>,
    user_id: i64,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM rts_sessions WHERE user_id = ?")
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(())
}
