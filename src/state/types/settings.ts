/** Transcribed from app/models/system_setting.py + the system-settings router. */

export interface SystemSettingResponse {
  setting_id: number;
  company_id: number;
  key: string;
  value: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** POST /system-settings/ — `company_id` comes from the token, not the body. */
export interface SystemSettingCreate {
  key: string;
  value: string;
  description?: string | null;
}

/**
 * PATCH by id sends whatever changed; PATCH by key reads only `value`.
 *
 * NOTE: the repository's update skips `None`, so a field cannot be cleared
 * back to null once it has a value — sending `description: null` is a no-op.
 */
export interface SystemSettingUpdate {
  value?: string;
  description?: string | null;
}

/** PATCH /system-settings/bulk — every entry is upserted by key. */
export interface BulkUpdateRequest {
  settings: { key: string; value: string }[];
}

/** The bulk-update route returns a message plus the rows it touched. */
export interface BulkUpdateResponse {
  message: string;
  updated: SystemSettingResponse[];
}

/** POST /system-settings/bulk — 409s if any key already exists. */
export interface BulkCreateRequest {
  settings: SystemSettingCreate[];
}
