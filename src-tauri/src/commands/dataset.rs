use crate::{AppState, AppError};
use crate::models::dataset::*;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct SaveDatasetPayload {
    pub id: String,
    pub label: String,
    pub imported_at: Option<String>,
    pub row_count: i64,
    pub unmapped_rows: i64,
    pub brand_data_json: Option<serde_json::Value>,
    pub region_data_json: Option<serde_json::Value>,
}

#[tauri::command]
pub async fn save_legacy_dataset(
    state: tauri::State<'_, AppState>,
    payload: SaveDatasetPayload,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO datasets (id, label, imported_at, row_count, unmapped_rows, brand_data_json, region_data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           label = excluded.label,
           imported_at = excluded.imported_at,
           row_count = excluded.row_count,
           unmapped_rows = excluded.unmapped_rows,
           brand_data_json = excluded.brand_data_json,
           region_data_json = excluded.region_data_json"
    )
    .bind(&payload.id)
    .bind(&payload.label)
    .bind(&payload.imported_at)
    .bind(payload.row_count)
    .bind(payload.unmapped_rows)
    .bind(payload.brand_data_json.as_ref().map(|v| v.to_string()))
    .bind(payload.region_data_json.as_ref().map(|v| v.to_string()))
    .execute(&state.db)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn get_legacy_datasets(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Dataset>, AppError> {
    let rows = sqlx::query_as::<_, Dataset>(
        "SELECT id, label, imported_at, row_count, unmapped_rows, brand_data_json, region_data_json
         FROM datasets ORDER BY imported_at DESC"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn delete_legacy_dataset(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM datasets WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct SaveAnalyticsDatasetPayload {
    pub id: String,
    pub label: String,
    pub imported_by: Option<i64>,
    pub row_count: i64,
    pub unmapped_rows: i64,
    pub source_type: Option<String>,
    pub is_active: Option<i64>,
}

#[tauri::command]
pub async fn save_analytics_dataset(
    state: tauri::State<'_, AppState>,
    payload: SaveAnalyticsDatasetPayload,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO analytics_datasets (id, label, imported_by, row_count, unmapped_rows, source_type, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           label = excluded.label,
           imported_by = excluded.imported_by,
           row_count = excluded.row_count,
           unmapped_rows = excluded.unmapped_rows,
           source_type = excluded.source_type,
           is_active = excluded.is_active,
           updated_at = datetime('now')"
    )
    .bind(&payload.id)
    .bind(&payload.label)
    .bind(payload.imported_by)
    .bind(payload.row_count)
    .bind(payload.unmapped_rows)
    .bind(payload.source_type.as_deref().unwrap_or("excel"))
    .bind(payload.is_active.unwrap_or(1))
    .execute(&state.db)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn get_analytics_datasets(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AnalyticsDataset>, AppError> {
    let rows = sqlx::query_as::<_, AnalyticsDataset>(
        "SELECT id, label, imported_at, imported_by, row_count, unmapped_rows, source_type, is_active, created_at, updated_at
         FROM analytics_datasets ORDER BY imported_at DESC"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn get_analytics_dataset(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<Option<AnalyticsDataset>, AppError> {
    let row = sqlx::query_as::<_, AnalyticsDataset>(
        "SELECT id, label, imported_at, imported_by, row_count, unmapped_rows, source_type, is_active, created_at, updated_at
         FROM analytics_datasets WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;
    Ok(row)
}

#[tauri::command]
pub async fn delete_analytics_dataset(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM analytics_datasets WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct SaveBrandDataPayload {
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
}

#[tauri::command]
pub async fn save_analytics_brand_data(
    state: tauri::State<'_, AppState>,
    payload: SaveBrandDataPayload,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO analytics_brand_data
         (dataset_id, brand, creator_code, overall, delivered, for_return, returned, total_rts, pending, data_process, delivered_rate, rts_rate, regions, municipalities)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dataset_id, brand) DO UPDATE SET
           creator_code = excluded.creator_code,
           overall = excluded.overall,
           delivered = excluded.delivered,
           for_return = excluded.for_return,
           returned = excluded.returned,
           total_rts = excluded.total_rts,
           pending = excluded.pending,
           data_process = excluded.data_process,
           delivered_rate = excluded.delivered_rate,
           rts_rate = excluded.rts_rate,
           regions = excluded.regions,
           municipalities = excluded.municipalities"
    )
    .bind(&payload.dataset_id)
    .bind(&payload.brand)
    .bind(&payload.creator_code)
    .bind(payload.overall)
    .bind(payload.delivered)
    .bind(payload.for_return)
    .bind(payload.returned)
    .bind(payload.total_rts)
    .bind(payload.pending)
    .bind(payload.data_process)
    .bind(payload.delivered_rate)
    .bind(payload.rts_rate)
    .bind(&payload.regions)
    .bind(&payload.municipalities)
    .execute(&state.db)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn get_analytics_brand_data(
    state: tauri::State<'_, AppState>,
    dataset_id: String,
) -> Result<Vec<AnalyticsBrandData>, AppError> {
    let rows = sqlx::query_as::<_, AnalyticsBrandData>(
        "SELECT id, dataset_id, brand, creator_code, overall, delivered, for_return, returned, total_rts, pending, data_process, delivered_rate, rts_rate, regions, municipalities, created_at
         FROM analytics_brand_data WHERE dataset_id = ? ORDER BY brand"
    )
    .bind(&dataset_id)
    .fetch_all(&state.db)
    .await?;
    Ok(rows)
}

#[derive(Debug, Deserialize)]
pub struct SaveRegionDataPayload {
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
}

#[tauri::command]
pub async fn save_analytics_region_data(
    state: tauri::State<'_, AppState>,
    payload: SaveRegionDataPayload,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO analytics_region_data
         (dataset_id, region, province, city, overall, delivered, for_return, returned, total_rts, delivered_rate, rts_rate, brands)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dataset_id, region, province, city) DO UPDATE SET
           overall = excluded.overall,
           delivered = excluded.delivered,
           for_return = excluded.for_return,
           returned = excluded.returned,
           total_rts = excluded.total_rts,
           delivered_rate = excluded.delivered_rate,
           rts_rate = excluded.rts_rate,
           brands = excluded.brands"
    )
    .bind(&payload.dataset_id)
    .bind(&payload.region)
    .bind(&payload.province)
    .bind(&payload.city)
    .bind(payload.overall)
    .bind(payload.delivered)
    .bind(payload.for_return)
    .bind(payload.returned)
    .bind(payload.total_rts)
    .bind(payload.delivered_rate)
    .bind(payload.rts_rate)
    .bind(&payload.brands)
    .execute(&state.db)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn get_analytics_region_data(
    state: tauri::State<'_, AppState>,
    dataset_id: String,
) -> Result<Vec<AnalyticsRegionData>, AppError> {
    let rows = sqlx::query_as::<_, AnalyticsRegionData>(
        "SELECT id, dataset_id, region, province, city, overall, delivered, for_return, returned, total_rts, delivered_rate, rts_rate, brands, created_at
         FROM analytics_region_data WHERE dataset_id = ? ORDER BY region, province, city"
    )
    .bind(&dataset_id)
    .fetch_all(&state.db)
    .await?;
    Ok(rows)
}

use calamine::{Reader, Xlsx, open_workbook};
use std::collections::HashMap;

fn clean_cell(v: &calamine::Data) -> String {
    match v {
        calamine::Data::String(s) => s.trim().to_string(),
        calamine::Data::Float(f) => f.to_string(),
        calamine::Data::Int(i) => i.to_string(),
        calamine::Data::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

fn parse_number(v: &str) -> i64 {
    v.trim().replace(',', "").replace('%', "").parse().unwrap_or(0)
}

fn normalize_header(v: &str) -> String {
    v.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "")
}

#[derive(Debug, serde::Deserialize)]
pub struct ImportExcelPayload {
    pub file_path: String,
    pub label: String,
    pub imported_by: Option<i64>,
}

#[derive(Debug, serde::Serialize)]
pub struct ImportExcelResult {
    pub dataset_id: String,
    pub row_count: i64,
    pub unmapped_rows: i64,
    pub brand_count: usize,
    pub region_count: usize,
}

#[tauri::command]
pub async fn import_excel_dataset(
    state: tauri::State<'_, AppState>,
    payload: ImportExcelPayload,
) -> Result<ImportExcelResult, AppError> {
    let mut workbook: Xlsx<std::io::BufReader<std::fs::File>> = open_workbook(&payload.file_path)
        .map_err(|e| AppError::Internal(format!("Failed to open workbook: {}", e)))?;

    let sheet = workbook.worksheets().into_iter().next()
        .ok_or_else(|| AppError::Internal("No worksheet found".to_string()))?;

    let (name, range) = sheet;
    let rows: Vec<Vec<calamine::Data>> = range.rows().map(|r| r.to_vec()).collect();
    if rows.is_empty() {
        return Err(AppError::Validation("Empty spreadsheet".to_string()));
    }

    let headers: Vec<String> = rows[0].iter().map(clean_cell).collect();
    let header_map: HashMap<String, usize> = headers.iter().enumerate()
        .map(|(i, h)| (normalize_header(h), i))
        .collect();

    let find = |names: &[&str]| -> Option<usize> {
        for n in names {
            let key = normalize_header(n);
            if let Some(&idx) = header_map.get(&key) { return Some(idx); }
            for (h, &idx) in &header_map {
                if h.contains(&key) { return Some(idx); }
            }
        }
        None
    };

    let creator_idx = find(&["Creator Code", "CreatorCode", "creator_code"]);
    let status_idx = find(&["Order Status", "Status", "orderstatus", "order_status"]);
    let brand_idx = find(&["Sender Name", "Brand", "Brand Name", "sendername", "brandname"]);
    let province_idx = find(&["Province", "province"]);
    let city_idx = find(&["City", "city"]);
    let region_idx = find(&["Region", "region"]);

    let mut unmapped = 0i64;
    let mut brand_map: HashMap<(String, String), (i64, i64, i64)> = HashMap::new(); // (creator, brand) -> (overall, delivered, returned)
    let mut region_map: HashMap<(String, String, String, String), (i64, i64, i64)> = HashMap::new(); // (region, province, city, creator) -> (overall, delivered, returned)
    let mut brand_regions: HashMap<(String, String), Vec<String>> = HashMap::new();
    let mut region_brands: HashMap<(String, String, String), Vec<String>> = HashMap::new();

    for row in &rows[1..] {
        let creator = creator_idx.and_then(|i| row.get(i)).map(clean_cell).unwrap_or_default();
        let status = status_idx.and_then(|i| row.get(i)).map(clean_cell).unwrap_or_default().to_lowercase();
        let brand = brand_idx.and_then(|i| row.get(i)).map(clean_cell).unwrap_or_default();
        let province = province_idx.and_then(|i| row.get(i)).map(clean_cell).unwrap_or_default();
        let city = city_idx.and_then(|i| row.get(i)).map(clean_cell).unwrap_or_default();
        let region = region_idx.and_then(|i| row.get(i)).map(clean_cell).unwrap_or_default().to_uppercase();

        if creator.is_empty() && brand.is_empty() {
            unmapped += 1;
            continue;
        }

        let delivered = if status.contains("delivered") { 1 } else { 0 };
        let returned = if status.contains("returned") && !status.contains("for return") { 1 } else { 0 };
        let for_return = if status.contains("for return") { 1 } else { 0 };
        let overall = 1;

        // Brand aggregation
        if !brand.is_empty() {
            let key = (creator.clone(), brand.clone());
            let entry = brand_map.entry(key.clone()).or_insert((0, 0, 0));
            entry.0 += overall;
            entry.1 += delivered;
            entry.2 += returned + for_return; // total_rts = for_return + returned

            if !region.is_empty() {
                brand_regions.entry(key).or_default().push(region.clone());
            }
        }

        // Region aggregation
        if !region.is_empty() {
            let key = (region.clone(), province.clone(), city.clone(), creator.clone());
            let entry = region_map.entry(key.clone()).or_insert((0, 0, 0));
            entry.0 += overall;
            entry.1 += delivered;
            entry.2 += returned + for_return;

            if !brand.is_empty() {
                region_brands.entry((region, province, city)).or_default().push(brand.clone());
            }
        }
    }

    let dataset_id = uuid::Uuid::new_v4().to_string();
    let row_count = (rows.len().saturating_sub(1)) as i64;

    // Insert dataset
    sqlx::query(
        "INSERT INTO analytics_datasets (id, label, imported_by, row_count, unmapped_rows, source_type, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&dataset_id)
    .bind(&payload.label)
    .bind(payload.imported_by)
    .bind(row_count)
    .bind(unmapped)
    .bind("excel")
    .bind(1)
    .execute(&state.db)
    .await?;

    // Insert brand data
    for ((creator, brand), (overall, delivered, total_rts)) in &brand_map {
        let for_return = total_rts.saturating_sub(*total_rts); // we aggregated total_rts as for_return+returned, can't separate here
        let returned = *total_rts;
        let pending = overall.saturating_sub(delivered + total_rts);
        let data_process = delivered + total_rts;
        let denominator = delivered + total_rts;
        let delivered_rate = if denominator > 0 { (*delivered as f64) / (denominator as f64) * 100.0 } else { 0.0 };
        let rts_rate = if denominator > 0 { (*total_rts as f64) / (denominator as f64) * 100.0 } else { 0.0 };

        let regions = brand_regions.get(&(creator.clone(), brand.clone()))
            .map(|v| v.join(", ")).unwrap_or_default();

        sqlx::query(
            "INSERT INTO analytics_brand_data
             (dataset_id, brand, creator_code, overall, delivered, for_return, returned, total_rts, pending, data_process, delivered_rate, rts_rate, regions, municipalities)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&dataset_id)
        .bind(brand)
        .bind(creator)
        .bind(*overall)
        .bind(*delivered)
        .bind(0i64) // for_return separated not available in this aggregation
        .bind(returned)
        .bind(*total_rts)
        .bind(pending)
        .bind(data_process)
        .bind(delivered_rate)
        .bind(rts_rate)
        .bind(&regions)
        .bind("")
        .execute(&state.db)
        .await?;
    }

    // Insert region data
    for ((region, province, city, creator), (overall, delivered, total_rts)) in &region_map {
        let denominator = delivered + total_rts;
        let delivered_rate = if denominator > 0 { (*delivered as f64) / (denominator as f64) * 100.0 } else { 0.0 };
        let rts_rate = if denominator > 0 { (*total_rts as f64) / (denominator as f64) * 100.0 } else { 0.0 };

        let brands = region_brands.get(&(region.clone(), province.clone(), city.clone()))
            .map(|v| {
                let mut unique = v.clone();
                unique.sort();
                unique.dedup();
                unique.join(", ")
            })
            .unwrap_or_default();

        sqlx::query(
            "INSERT INTO analytics_region_data
             (dataset_id, region, province, city, overall, delivered, for_return, returned, total_rts, delivered_rate, rts_rate, brands)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&dataset_id)
        .bind(region)
        .bind(province)
        .bind(city)
        .bind(*overall)
        .bind(*delivered)
        .bind(0i64)
        .bind(*total_rts)
        .bind(*total_rts)
        .bind(delivered_rate)
        .bind(rts_rate)
        .bind(&brands)
        .execute(&state.db)
        .await?;
    }

    Ok(ImportExcelResult {
        dataset_id,
        row_count,
        unmapped_rows: unmapped,
        brand_count: brand_map.len(),
        region_count: region_map.len(),
    })
}
