/**
 * KPI Input Normalizer
 *
 * Normalizes KPI input from various formats to internal field names.
 *
 * Supported input formats (per Connector 1 AC3):
 * - API format: { "kpi_1-1": "2025-10-15" }
 * - Number format: { "1-1": "2025-10-15" }
 * - Internal format: { "Building_Permit_Date_Of_Building_Permit_Application": "2025-10-15" }
 *
 * All formats are converted to internal field names for processing.
 */

import {
  KPI_REGISTRY,
  API_KEY_MAP,
  FIELD_NAME_MAP,
  parseKpiIdentifier,
  formatKpiNumber,
  type KpiDefinition,
} from "./registry";

// =============================================================================
// Types
// =============================================================================

export interface NormalizationResult {
  /** Successfully normalized data with internal field names */
  data: Record<string, unknown>;

  /** Fields that were successfully mapped */
  mappedFields: Array<{
    original: string;
    fieldName: string;
    kpiNumber: string;
  }>;

  /** Fields that could not be mapped (unknown keys) */
  unknownFields: string[];

  /** Warnings for potential issues */
  warnings: string[];
}

export interface NormalizationOptions {
  /** Whether to include unknown fields in output (default: false) */
  includeUnknownFields?: boolean;

  /** Whether to throw on unknown fields (default: false) */
  strictMode?: boolean;
}

// =============================================================================
// Normalizer Functions
// =============================================================================

/**
 * Normalize a single key to internal field name
 * Returns the KPI definition if found, null otherwise
 */
export function normalizeKey(key: string): KpiDefinition | null {
  // 1. Try direct field name match (internal format)
  if (FIELD_NAME_MAP.has(key)) {
    return FIELD_NAME_MAP.get(key)!;
  }

  // 2. Try API key match (kpi_1-1 format)
  if (API_KEY_MAP.has(key)) {
    return API_KEY_MAP.get(key)!;
  }

  // 3. Try parsing as KPI identifier (various formats)
  const kpiNumber = parseKpiIdentifier(key);
  if (kpiNumber && KPI_REGISTRY[kpiNumber]) {
    return KPI_REGISTRY[kpiNumber];
  }

  return null;
}

/**
 * Normalize KPI input data to internal field names
 *
 * @example
 * // Input in API format
 * normalizeKpiInput({ "kpi_1-1": "2025-10-15", "kpi_3-1": "OFFICE" })
 *
 * // Output with internal field names
 * {
 *   data: {
 *     Building_Permit_Date_Of_Building_Permit_Application: "2025-10-15",
 *     Building_Use_Type_Primary_Use_Of_Building: "OFFICE"
 *   },
 *   mappedFields: [...],
 *   unknownFields: [],
 *   warnings: []
 * }
 */
export function normalizeKpiInput(
  input: Record<string, unknown>,
  options: NormalizationOptions = {}
): NormalizationResult {
  const { includeUnknownFields = false, strictMode = false } = options;

  const result: NormalizationResult = {
    data: {},
    mappedFields: [],
    unknownFields: [],
    warnings: [],
  };

  // Reserved/context keys that should pass through
  const reservedKeys = new Set([
    "schema_version",
    "activity_in_value_chain",
    "building_category",
    "building_id",
    "external_id",
    "name",
    "address",
  ]);

  for (const [key, value] of Object.entries(input)) {
    // Skip null/undefined values
    if (value === null || value === undefined) {
      continue;
    }

    // Pass through reserved keys
    if (reservedKeys.has(key)) {
      result.data[key] = value;
      continue;
    }

    // Try to normalize the key
    const kpiDef = normalizeKey(key);

    if (kpiDef) {
      // Successfully mapped
      result.data[kpiDef.fieldName] = value;
      result.mappedFields.push({
        original: key,
        fieldName: kpiDef.fieldName,
        kpiNumber: kpiDef.number,
      });

      // Add warning if using deprecated or unusual format
      if (key !== kpiDef.fieldName && key !== kpiDef.apiKey) {
        result.warnings.push(
          `Field "${key}" was normalized to "${kpiDef.apiKey}" (${formatKpiNumber(kpiDef.number)})`
        );
      }
    } else {
      // Unknown field
      result.unknownFields.push(key);

      if (includeUnknownFields) {
        result.data[key] = value;
      }

      if (strictMode) {
        throw new Error(`Unknown KPI field: "${key}". Valid formats: kpi_X-X, X-X, or internal field names.`);
      }
    }
  }

  return result;
}

/**
 * Convert internal field names back to API format
 * Useful for API responses
 */
export function toApiFormat(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const kpiDef = FIELD_NAME_MAP.get(key);

    if (kpiDef) {
      result[kpiDef.apiKey] = value;
    } else {
      // Pass through non-KPI fields
      result[key] = value;
    }
  }

  return result;
}

/**
 * Convert internal field names to KPI number format
 * Useful for error messages (e.g., "Missing KPI 1-1")
 */
export function toNumberFormat(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const kpiDef = FIELD_NAME_MAP.get(key);

    if (kpiDef) {
      result[kpiDef.number] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Get field name from any format
 */
export function getFieldName(key: string): string | null {
  const kpiDef = normalizeKey(key);
  return kpiDef?.fieldName ?? null;
}

/**
 * Get KPI number from any format
 */
export function getKpiNumber(key: string): string | null {
  const kpiDef = normalizeKey(key);
  return kpiDef?.number ?? null;
}

/**
 * Get API key from any format
 */
export function getApiKey(key: string): string | null {
  const kpiDef = normalizeKey(key);
  return kpiDef?.apiKey ?? null;
}

/**
 * Validate that all required KPIs are present in normalized data
 */
export function validateRequiredKpis(
  data: Record<string, unknown>,
  requiredKpis: string[]
): { valid: boolean; missingKpis: string[] } {
  const missingKpis: string[] = [];

  for (const kpiNumber of requiredKpis) {
    const kpiDef = KPI_REGISTRY[kpiNumber];
    if (!kpiDef) continue;

    const value = data[kpiDef.fieldName];
    if (value === undefined || value === null || value === "") {
      missingKpis.push(kpiNumber);
    }
  }

  return {
    valid: missingKpis.length === 0,
    missingKpis,
  };
}

/**
 * Format missing KPIs for error message
 * Returns: "Missing KPI 1-1, KPI 3-1"
 */
export function formatMissingKpisError(missingKpis: string[]): string {
  if (missingKpis.length === 0) return "";

  const formatted = missingKpis.map(formatKpiNumber);

  if (formatted.length === 1) {
    return `Missing ${formatted[0]}`;
  }

  return `Missing ${formatted.join(", ")}`;
}

/**
 * Create a mapping summary for documentation/debugging
 */
export function getMappingSummary(): Array<{
  number: string;
  apiKey: string;
  fieldName: string;
  type: string;
}> {
  return Object.values(KPI_REGISTRY).map((kpi) => ({
    number: kpi.number,
    apiKey: kpi.apiKey,
    fieldName: kpi.fieldName,
    type: kpi.type,
  }));
}
