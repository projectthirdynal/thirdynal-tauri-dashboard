-- ──────────────────────────────────────────────────────────
-- THIRDYNAL Dashboard — Full SQLite Schema (ported from Electron app)
-- ──────────────────────────────────────────────────────────

-- Settings: key-value store for app configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- RTS Users (includes password_hash for local auth)
CREATE TABLE IF NOT EXISTS rts_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'staff' CHECK(role IN ('admin','supervisor','staff','viewer')),
    branch TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- RTS Records (waybill / parcel tracking)
CREATE TABLE IF NOT EXISTS rts_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    waybill_number TEXT NOT NULL UNIQUE,
    courier TEXT DEFAULT 'J&T',
    rts_status TEXT DEFAULT 'scanned' CHECK(rts_status IN ('scanned','pending','pending_verification','verified','duplicate','issue','returned_to_supplier','disposed','rejected')),
    staff_id INTEGER,
    branch TEXT,
    scan_method TEXT DEFAULT 'manual' CHECK(scan_method IN ('barcode','qr','ocr','manual','camera','barcode_scanner','csv_import')),
    ocr_confidence REAL DEFAULT 0,
    duplicate_flag INTEGER DEFAULT 0,
    remarks TEXT,
    remark_code TEXT,
    remark_text TEXT,
    scanned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    verified_at TEXT,
    verified_by INTEGER,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(staff_id) REFERENCES rts_users(id),
    FOREIGN KEY(verified_by) REFERENCES rts_users(id)
);

-- RTS Photos / video evidence
CREATE TABLE IF NOT EXISTS rts_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rts_record_id INTEGER NOT NULL,
    photo_type TEXT DEFAULT 'other' CHECK(photo_type IN ('parcel_front','waybill_closeup','parcel_side','damage_proof','scan_proof','video_proof','thumbnail','other')),
    file_path TEXT NOT NULL,
    file_name TEXT,
    mime_type TEXT,
    file_size INTEGER,
    duration_seconds REAL,
    thumbnail_path TEXT,
    uploaded_by INTEGER,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(rts_record_id) REFERENCES rts_records(id) ON DELETE CASCADE,
    FOREIGN KEY(uploaded_by) REFERENCES rts_users(id)
);

-- RTS Scan Logs (audit trail)
CREATE TABLE IF NOT EXISTS rts_scan_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    waybill_number TEXT,
    staff_id INTEGER,
    action TEXT CHECK(action IN ('scanned','photo_uploaded','manual_corrected','duplicate_detected','verified','rejected')),
    device_info TEXT,
    ip_address TEXT,
    location TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(staff_id) REFERENCES rts_users(id)
);

-- Session management
CREATE TABLE IF NOT EXISTS rts_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES rts_users(id) ON DELETE CASCADE
);

-- Analytics: Dataset metadata
CREATE TABLE IF NOT EXISTS analytics_datasets (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
    imported_by INTEGER,
    row_count INTEGER DEFAULT 0,
    unmapped_rows INTEGER DEFAULT 0,
    source_type TEXT DEFAULT 'excel' CHECK(source_type IN ('excel','google_sheet','api')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(imported_by) REFERENCES rts_users(id)
);

-- Analytics: Brand data per dataset
CREATE TABLE IF NOT EXISTS analytics_brand_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id TEXT NOT NULL,
    brand TEXT NOT NULL,
    creator_code TEXT,
    overall INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    for_return INTEGER DEFAULT 0,
    returned INTEGER DEFAULT 0,
    total_rts INTEGER DEFAULT 0,
    pending INTEGER DEFAULT 0,
    data_process INTEGER DEFAULT 0,
    delivered_rate REAL DEFAULT 0,
    rts_rate REAL DEFAULT 0,
    regions TEXT DEFAULT '{}',
    municipalities TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dataset_id, brand),
    FOREIGN KEY(dataset_id) REFERENCES analytics_datasets(id) ON DELETE CASCADE
);

-- Analytics: Region data per dataset
CREATE TABLE IF NOT EXISTS analytics_region_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id TEXT NOT NULL,
    region TEXT NOT NULL CHECK(region IN ('LUZON','MANILA','VISAYAS','MINDANAO')),
    province TEXT,
    city TEXT,
    overall INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    for_return INTEGER DEFAULT 0,
    returned INTEGER DEFAULT 0,
    total_rts INTEGER DEFAULT 0,
    delivered_rate REAL DEFAULT 0,
    rts_rate REAL DEFAULT 0,
    brands TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dataset_id, region, province, city),
    FOREIGN KEY(dataset_id) REFERENCES analytics_datasets(id) ON DELETE CASCADE
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rts_records_waybill ON rts_records(waybill_number);
CREATE INDEX IF NOT EXISTS idx_rts_records_scanned_at ON rts_records(scanned_at);
CREATE INDEX IF NOT EXISTS idx_rts_photos_record_id ON rts_photos(rts_record_id);
CREATE INDEX IF NOT EXISTS idx_rts_scan_logs_waybill ON rts_scan_logs(waybill_number);
CREATE INDEX IF NOT EXISTS idx_rts_scan_logs_created ON rts_scan_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rts_sessions_user ON rts_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_datasets_label ON analytics_datasets(label);
CREATE INDEX IF NOT EXISTS idx_analytics_datasets_active ON analytics_datasets(is_active);
CREATE INDEX IF NOT EXISTS idx_analytics_brand_dataset ON analytics_brand_data(dataset_id);
CREATE INDEX IF NOT EXISTS idx_analytics_brand_name ON analytics_brand_data(brand);
CREATE INDEX IF NOT EXISTS idx_analytics_region_dataset ON analytics_region_data(dataset_id);
CREATE INDEX IF NOT EXISTS idx_analytics_region_name ON analytics_region_data(region);

-- ── Default admin user ───────────────────────────────────
INSERT OR IGNORE INTO rts_users (id, full_name, email, role, branch, status)
VALUES (1, 'Admin', 'admin@thirdynal.com', 'admin', 'Main', 'active');

-- ── Legacy compatibility: simple datasets table (JSON blob) ──
CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    imported_at TEXT,
    row_count INTEGER DEFAULT 0,
    unmapped_rows INTEGER DEFAULT 0,
    brand_data_json TEXT,
    region_data_json TEXT
);
