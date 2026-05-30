use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct RTSRecord {
    pub id: i64,
    pub waybill_number: String,
    pub courier: String,
    pub rts_status: String,
    pub staff_id: Option<i64>,
    pub branch: Option<String>,
    pub scan_method: String,
    pub ocr_confidence: f64,
    pub duplicate_flag: i64,
    pub remarks: Option<String>,
    pub remark_code: Option<String>,
    pub remark_text: Option<String>,
    pub scanned_at: String,
    pub verified_at: Option<String>,
    pub verified_by: Option<i64>,
    pub updated_at: Option<String>,
}

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct RTSRecordWithStaff {
    pub id: i64,
    pub waybill_number: String,
    pub courier: String,
    pub rts_status: String,
    pub staff_id: Option<i64>,
    pub staff_name: Option<String>,
    pub branch: Option<String>,
    pub scan_method: String,
    pub ocr_confidence: f64,
    pub duplicate_flag: i64,
    pub remarks: Option<String>,
    pub remark_code: Option<String>,
    pub remark_text: Option<String>,
    pub scanned_at: String,
    pub verified_at: Option<String>,
    pub verified_by: Option<i64>,
    pub updated_at: Option<String>,
    pub photo_count: Option<i64>,
}

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct RTSPhoto {
    pub id: i64,
    pub rts_record_id: i64,
    pub photo_type: String,
    pub file_path: String,
    pub file_name: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
    pub duration_seconds: Option<f64>,
    pub thumbnail_path: Option<String>,
    pub uploaded_by: Option<i64>,
    pub uploaded_at: String,
}

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct RTSScanLog {
    pub id: i64,
    pub waybill_number: Option<String>,
    pub staff_id: Option<i64>,
    pub staff_name: Option<String>,
    pub action: Option<String>,
    pub device_info: Option<String>,
    pub ip_address: Option<String>,
    pub location: Option<String>,
    pub created_at: String,
}

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub user_id: i64,
    pub expires_at: String,
    pub created_at: String,
}

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct RTSStats {
    pub today: i64,
    pub week: i64,
    pub month: i64,
    pub duplicates: i64,
    pub pending: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewRTSRecord {
    pub waybill_number: String,
    pub courier: Option<String>,
    pub rts_status: Option<String>,
    pub staff_id: Option<i64>,
    pub branch: Option<String>,
    pub scan_method: Option<String>,
    pub ocr_confidence: Option<f64>,
    pub duplicate_flag: Option<bool>,
    pub remarks: Option<String>,
    pub remark_code: Option<String>,
    pub remark_text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewRTSPhoto {
    pub rts_record_id: i64,
    pub photo_type: Option<String>,
    pub file_path: String,
    pub file_name: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
    pub duration_seconds: Option<f64>,
    pub thumbnail_path: Option<String>,
    pub uploaded_by: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewRTSScanLog {
    pub waybill_number: Option<String>,
    pub staff_id: Option<i64>,
    pub action: Option<String>,
    pub device_info: Option<String>,
    pub ip_address: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RTSRecordFilters {
    pub waybill: Option<String>,
    pub status: Option<String>,
    pub staff_id: Option<i64>,
    pub branch: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}
