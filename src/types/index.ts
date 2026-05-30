export interface User {
  id: number;
  full_name: string;
  email: string | null;
  role: 'admin' | 'supervisor' | 'staff' | 'viewer';
  branch: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface LoginResponse {
  user: User;
  session_id: string;
}

export interface Dataset {
  id: string;
  label: string;
  imported_at: string;
  row_count: number;
  unmapped_rows: number;
  brand_data?: Record<string, unknown>;
  region_data?: Record<string, unknown>;
}

export interface AnalyticsDataset {
  id: string;
  label: string;
  imported_at: string;
  imported_by: number | null;
  row_count: number;
  unmapped_rows: number;
  source_type: string;
  is_active: number;
  created_at: string;
  updated_at: string | null;
}

export interface AnalyticsBrandData {
  id: number;
  dataset_id: string;
  brand: string;
  creator_code: string | null;
  overall: number;
  delivered: number;
  for_return: number;
  returned: number;
  total_rts: number;
  pending: number;
  data_process: number;
  delivered_rate: number;
  rts_rate: number;
  regions: string | null;
  municipalities: string | null;
  created_at: string;
}

export interface AnalyticsRegionData {
  id: number;
  dataset_id: string;
  region: string;
  province: string | null;
  city: string | null;
  overall: number;
  delivered: number;
  for_return: number;
  returned: number;
  total_rts: number;
  delivered_rate: number;
  rts_rate: number;
  brands: string | null;
  created_at: string;
}

export type RTSStatus = 'scanned' | 'pending_verification' | 'verified' | 'duplicate' | 'issue' | 'returned_to_supplier' | 'disposed';
export type ScanMethod = 'barcode' | 'qr' | 'ocr' | 'manual';

export interface RTSRecord {
  id: number;
  waybill_number: string;
  courier: string;
  rts_status: RTSStatus;
  staff_id?: number;
  branch?: string;
  scan_method: ScanMethod;
  ocr_confidence: number;
  duplicate_flag: boolean;
  remarks?: string;
  remark_code?: string;
  remark_text?: string;
  scanned_at: string;
  verified_at?: string;
  verified_by?: number;
  created_at: string;
  updated_at: string;
  staff_name?: string;
  photo_count?: number;
}

export interface RTSPhoto {
  id: number;
  rts_record_id: number;
  photo_type: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  duration_seconds: number | null;
  thumbnail_path: string | null;
  uploaded_by: number | null;
  uploaded_at: string;
}

export interface RTSScanLog {
  id: number;
  waybill_number: string;
  staff_id: number | null;
  staff_name?: string;
  action: string;
  device_info: string | null;
  ip_address: string | null;
  location: string | null;
  created_at: string;
}

export interface RTSStats {
  today: number;
  week: number;
  month: number;
  duplicates: number;
  pending: number;
}
