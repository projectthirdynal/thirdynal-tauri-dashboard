use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: i64,
    pub full_name: String,
    pub email: Option<String>,
    pub password_hash: Option<String>,
    pub role: String,
    pub branch: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SafeUser {
    pub id: i64,
    pub full_name: String,
    pub email: Option<String>,
    pub role: String,
    pub branch: Option<String>,
    pub status: String,
}
