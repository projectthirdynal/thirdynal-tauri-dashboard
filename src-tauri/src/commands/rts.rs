use crate::{AppState, AppError};
use crate::models::rts::*;
use tauri::Manager;

#[tauri::command]
pub async fn get_rts_records(
    state: tauri::State<'_, AppState>,
    filters: Option<RTSRecordFilters>,
) -> Result<Vec<RTSRecordWithStaff>, AppError> {
    let mut sql = String::from(
        "SELECT r.*, u.full_name as staff_name,
         (SELECT COUNT(*) FROM rts_photos WHERE rts_record_id = r.id) as photo_count
         FROM rts_records r
         LEFT JOIN rts_users u ON r.staff_id = u.id
         WHERE 1=1"
    );

    if let Some(f) = &filters {
        if f.waybill.is_some() { sql.push_str(" AND r.waybill_number LIKE ?"); }
        if f.status.is_some() { sql.push_str(" AND r.rts_status = ?"); }
        if f.staff_id.is_some() { sql.push_str(" AND r.staff_id = ?"); }
        if f.branch.is_some() { sql.push_str(" AND r.branch = ?"); }
        if f.date_from.is_some() { sql.push_str(" AND DATE(r.scanned_at) >= ?"); }
        if f.date_to.is_some() { sql.push_str(" AND DATE(r.scanned_at) <= ?"); }
    }
    sql.push_str(" ORDER BY r.scanned_at DESC LIMIT 1000");

    let mut query = sqlx::query_as::<_, RTSRecordWithStaff>(&sql);
    if let Some(f) = &filters {
        if let Some(v) = &f.waybill { query = query.bind(format!("%{}%", v)); }
        if let Some(v) = &f.status { query = query.bind(v); }
        if let Some(v) = f.staff_id { query = query.bind(v); }
        if let Some(v) = &f.branch { query = query.bind(v); }
        if let Some(v) = &f.date_from { query = query.bind(v); }
        if let Some(v) = &f.date_to { query = query.bind(v); }
    }

    let rows = query.fetch_all(&state.db).await?;
    Ok(rows)
}

#[tauri::command]
pub async fn get_rts_record(
    state: tauri::State<'_, AppState>,
    id: i64,
) -> Result<Option<RTSRecordWithStaff>, AppError> {
    let row = sqlx::query_as::<_, RTSRecordWithStaff>(
        "SELECT r.*, u.full_name as staff_name,
         (SELECT COUNT(*) FROM rts_photos WHERE rts_record_id = r.id) as photo_count
         FROM rts_records r
         LEFT JOIN rts_users u ON r.staff_id = u.id
         WHERE r.id = ?"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?;
    Ok(row)
}

#[tauri::command]
pub async fn get_rts_record_by_waybill(
    state: tauri::State<'_, AppState>,
    waybill: String,
) -> Result<Option<RTSRecordWithStaff>, AppError> {
    let row = sqlx::query_as::<_, RTSRecordWithStaff>(
        "SELECT r.*, u.full_name as staff_name,
         (SELECT COUNT(*) FROM rts_photos WHERE rts_record_id = r.id) as photo_count
         FROM rts_records r
         LEFT JOIN rts_users u ON r.staff_id = u.id
         WHERE r.waybill_number = ?"
    )
    .bind(waybill.to_uppercase())
    .fetch_optional(&state.db)
    .await?;
    Ok(row)
}

#[tauri::command]
pub async fn save_rts_record(
    state: tauri::State<'_, AppState>,
    record: NewRTSRecord,
) -> Result<i64, AppError> {
    let result = sqlx::query(
        "INSERT INTO rts_records
         (waybill_number, courier, rts_status, staff_id, branch, scan_method, ocr_confidence, duplicate_flag, remarks, remark_code, remark_text, scanned_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(waybill_number) DO UPDATE SET
           rts_status = excluded.rts_status,
           staff_id = excluded.staff_id,
           branch = excluded.branch,
           scan_method = excluded.scan_method,
           ocr_confidence = excluded.ocr_confidence,
           duplicate_flag = excluded.duplicate_flag,
           remarks = excluded.remarks,
           remark_code = excluded.remark_code,
           remark_text = excluded.remark_text,
           updated_at = datetime('now')"
    )
    .bind(&record.waybill_number)
    .bind(record.courier.as_deref().unwrap_or("J&T"))
    .bind(record.rts_status.as_deref().unwrap_or("scanned"))
    .bind(record.staff_id)
    .bind(record.branch.as_deref().unwrap_or("Main"))
    .bind(record.scan_method.as_deref().unwrap_or("manual"))
    .bind(record.ocr_confidence.unwrap_or(0.0))
    .bind(if record.duplicate_flag.unwrap_or(false) { 1i64 } else { 0i64 })
    .bind(&record.remarks)
    .bind(&record.remark_code)
    .bind(&record.remark_text)
    .execute(&state.db)
    .await?;

    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn update_rts_record_status(
    state: tauri::State<'_, AppState>,
    id: i64,
    status: String,
    verified_by: Option<i64>,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE rts_records SET rts_status = ?, verified_at = datetime('now'), verified_by = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(&status)
    .bind(verified_by)
    .bind(id)
    .execute(&state.db)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_rts_record(
    state: tauri::State<'_, AppState>,
    id: i64,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM rts_records WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn get_rts_photos(
    state: tauri::State<'_, AppState>,
    record_id: i64,
) -> Result<Vec<RTSPhoto>, AppError> {
    let rows = sqlx::query_as::<_, RTSPhoto>(
        "SELECT id, rts_record_id, photo_type, file_path, file_name, mime_type, file_size, duration_seconds, thumbnail_path, uploaded_by, uploaded_at
         FROM rts_photos WHERE rts_record_id = ? ORDER BY uploaded_at"
    )
    .bind(record_id)
    .fetch_all(&state.db)
    .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn save_rts_photo(
    state: tauri::State<'_, AppState>,
    photo: NewRTSPhoto,
) -> Result<i64, AppError> {
    let result = sqlx::query(
        "INSERT INTO rts_photos
         (rts_record_id, photo_type, file_path, file_name, mime_type, file_size, duration_seconds, thumbnail_path, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(photo.rts_record_id)
    .bind(photo.photo_type.as_deref().unwrap_or("other"))
    .bind(&photo.file_path)
    .bind(&photo.file_name)
    .bind(&photo.mime_type)
    .bind(photo.file_size)
    .bind(photo.duration_seconds)
    .bind(&photo.thumbnail_path)
    .bind(photo.uploaded_by)
    .execute(&state.db)
    .await?;

    Ok(result.last_insert_rowid())
}

#[derive(Debug, serde::Deserialize)]
pub struct UploadPhotoPayload {
    pub rts_record_id: i64,
    pub waybill_number: String,
    pub photo_type: Option<String>,
    pub file_name: String,
    pub mime_type: String,
    pub base64_data: String,
    pub duration_seconds: Option<f64>,
    pub uploaded_by: i64,
}

#[tauri::command]
pub async fn upload_rts_photo(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: UploadPhotoPayload,
) -> Result<i64, AppError> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Failed to get app data dir: {}", e)))?;
    let date_folder = chrono::Local::now().format("%Y/%m/%d").to_string();
    let photo_dir = app_dir.join("rts-photos").join(&date_folder).join(&payload.waybill_number);
    std::fs::create_dir_all(&photo_dir)?;

    let file_path = photo_dir.join(&payload.file_name);
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &payload.base64_data)
        .map_err(|e| AppError::Internal(format!("Base64 decode error: {}", e)))?;
    std::fs::write(&file_path, &bytes)?;

    let file_size = bytes.len() as i64;

    let result = sqlx::query(
        "INSERT INTO rts_photos
         (rts_record_id, photo_type, file_path, file_name, mime_type, file_size, duration_seconds, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(payload.rts_record_id)
    .bind(payload.photo_type.as_deref().unwrap_or("other"))
    .bind(file_path.to_string_lossy())
    .bind(&payload.file_name)
    .bind(&payload.mime_type)
    .bind(file_size)
    .bind(payload.duration_seconds)
    .bind(payload.uploaded_by)
    .execute(&state.db)
    .await?;

    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn delete_rts_photo(
    state: tauri::State<'_, AppState>,
    id: i64,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM rts_photos WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn add_rts_scan_log(
    state: tauri::State<'_, AppState>,
    log: NewRTSScanLog,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO rts_scan_logs (waybill_number, staff_id, action, device_info, ip_address, location)
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&log.waybill_number)
    .bind(log.staff_id)
    .bind(&log.action)
    .bind(&log.device_info)
    .bind(&log.ip_address)
    .bind(&log.location)
    .execute(&state.db)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn get_rts_scan_logs(
    state: tauri::State<'_, AppState>,
    waybill: String,
) -> Result<Vec<RTSScanLog>, AppError> {
    let rows = sqlx::query_as::<_, RTSScanLog>(
        "SELECT l.*, u.full_name as staff_name
         FROM rts_scan_logs l
         LEFT JOIN rts_users u ON l.staff_id = u.id
         WHERE l.waybill_number = ?
         ORDER BY l.created_at DESC"
    )
    .bind(&waybill)
    .fetch_all(&state.db)
    .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn get_rts_stats(
    state: tauri::State<'_, AppState>,
) -> Result<RTSStats, AppError> {
    let today: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rts_records WHERE DATE(scanned_at) = DATE('now')"
    )
    .fetch_one(&state.db)
    .await?;

    let week: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rts_records WHERE scanned_at >= datetime('now', '-7 days')"
    )
    .fetch_one(&state.db)
    .await?;

    let month: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rts_records WHERE scanned_at >= datetime('now', '-30 days')"
    )
    .fetch_one(&state.db)
    .await?;

    let duplicates: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rts_records WHERE duplicate_flag = 1"
    )
    .fetch_one(&state.db)
    .await?;

    let pending: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rts_records WHERE rts_status = 'pending_verification'"
    )
    .fetch_one(&state.db)
    .await?;

    Ok(RTSStats {
        today: today.0,
        week: week.0,
        month: month.0,
        duplicates: duplicates.0,
        pending: pending.0,
    })
}
