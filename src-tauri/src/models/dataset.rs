use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;

/// Legacy dataset with JSON blob storage
#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct Dataset {
    pub id: String,
    pub label: String,
    pub imported_at: Option<String>,
    pub row_count: i64,
    pub unmapped_rows: i64,
    pub brand_data_json: Option<Value>,
    pub region_data_json: Option<Value>,
}

/// Normalized analytics dataset
#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct AnalyticsDataset {
    pub id: String,
    pub label: String,
    pub imported_at: String,
    pub imported_by: Option<i64>,
    pub row_count: i64,
    pub unmapped_rows: i64,
    pub source_type: String,
    pub is_active: i64,
    pub created_at: String,
    pub updated_at: Option<String>,
}

/// Brand-level breakdown per dataset
#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct AnalyticsBrandData {
    pub id: i64,
    pub dataset_id: String,
    pub brand: String,
    pub creator_code: Option<String>,
    pub overall: i64,
    pub delivered: i64,
    pub for_return: i64,
    pub returned: i64,
    pub total_rts: i64,
    pub pending: i64,
    pub data_process: i64,
    pub delivered_rate: f64,
    pub rts_rate: f64,
    pub regions: Option<String>,
    pub municipalities: Option<String>,
    pub created_at: String,
}

/// Region-level breakdown per dataset
#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct AnalyticsRegionData {
    pub id: i64,
    pub dataset_id: String,
    pub region: String,
    pub province: Option<String>,
    pub city: Option<String>,
    pub overall: i64,
    pub delivered: i64,
    pub for_return: i64,
    pub returned: i64,
    pub total_rts: i64,
    pub delivered_rate: f64,
    pub rts_rate: f64,
    pub brands: Option<String>,
    pub created_at: String,
}
