/**
 * KPI Input Normalizer
 *
 * Accepts KPI input in any supported format and restructures it
 * into the V0.9.0 section/key layout expected by C1InputSchema.
 *
 * Supported input formats (per Connector 1 AC3):
 *   - API format:    { "kpi_1-1": "2025-10-15" }
 *   - Number format: { "1-1": "2025-10-15" }
 *   - Schema key:    { "KPI_1_1_Date_Of_Building_Permit": "2025-10-15" }
 *   - Field name:    { "Building_Permit_Date_Of_Building_Permit_Application": "2025-10-15" }
 *   - Pre-sectioned: { "Property_Related_Data": { "KPI_1_1_...": value } }
 *
 * Output: C1-compatible sectioned structure ready for C1InputSchema.safeParse()
 */

import {
  KPI_REGISTRY,
  API_KEY_MAP,
  FIELD_NAME_MAP,
  SCHEMA_KEY_MAP,
  parseKpiIdentifier,
  type KpiDefinition,
  type KpiSection,
} from "./registry";

const KPI_SECTIONS: readonly KpiSection[] = [
  "Property_Related_Data",
  "Energy_Performance",
  "Energy_Consumption",
  "Greenhouse_Gases",
] as const;

const SECTION_SET = new Set<string>(KPI_SECTIONS);

export interface NormalizationResult {
  kpis: Record<string, Record<string, unknown>>;
  mappedFields: Array<{
    original: string;
    schemaKey: string;
    section: KpiSection;
    kpiNumber: string;
  }>;
  unknownFields: string[];
}

/**
 * Resolve a single key to its KpiDefinition.
 * Tries all lookup strategies: API key, number, schema key, field name.
 */
function resolveKey(key: string): KpiDefinition | null {
  // 1. API key map (handles both "kpi_1-1" and "1-1")
  if (API_KEY_MAP.has(key)) return API_KEY_MAP.get(key)!;

  // 2. Schema key (e.g. "KPI_1_1_Date_Of_Building_Permit")
  if (SCHEMA_KEY_MAP.has(key)) return SCHEMA_KEY_MAP.get(key)!;

  // 3. Internal field name (e.g. "Building_Permit_Date_Of_Building_Permit_Application")
  if (FIELD_NAME_MAP.has(key)) return FIELD_NAME_MAP.get(key)!;

  // 4. Parse as KPI identifier (handles "KPI 1-1", "kpi1-1", etc.)
  const kpiNumber = parseKpiIdentifier(key);
  if (kpiNumber && KPI_REGISTRY[kpiNumber]) return KPI_REGISTRY[kpiNumber];

  return null;
}

/**
 * Check whether the input is already in V0.9.0 sectioned format.
 * Returns true if any top-level key matches a known section name.
 */
function isAlreadySectioned(input: Record<string, unknown>): boolean {
  return Object.keys(input).some((key) => SECTION_SET.has(key));
}

/**
 * Normalize a flat KPI object into V0.9.0 sectioned structure.
 *
 * @example
 * // Flat API format
 * normalizeKpiInput({ "kpi_1-1": "2025-10-15", "kpi_3-1": "Büro" })
 * // → { kpis: { Property_Related_Data: { KPI_1_1_Date_Of_Building_Permit: "2025-10-15", KPI_3_1_Main_Use_Of_Building: "Büro" } }, ... }
 *
 * @example
 * // Already sectioned — passes through
 * normalizeKpiInput({ Property_Related_Data: { KPI_1_1_Date_Of_Building_Permit: "2025-10-15" } })
 * // → { kpis: { Property_Related_Data: { KPI_1_1_Date_Of_Building_Permit: "2025-10-15" } }, ... }
 */
export function normalizeKpiInput(
  input: Record<string, unknown>,
): NormalizationResult {
  const result: NormalizationResult = {
    kpis: {},
    mappedFields: [],
    unknownFields: [],
  };

  // If already in sectioned format, normalize each section's keys individually
  if (isAlreadySectioned(input)) {
    for (const sectionName of KPI_SECTIONS) {
      const sectionData = input[sectionName];
      if (!sectionData || typeof sectionData !== "object") continue;

      const section: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        sectionData as Record<string, unknown>,
      )) {
        if (value === null || value === undefined) continue;

        const def = resolveKey(key);
        if (def) {
          section[def.schemaKey] = value;
          result.mappedFields.push({
            original: `${sectionName}.${key}`,
            schemaKey: def.schemaKey,
            section: def.schemaSection,
            kpiNumber: def.number,
          });
        } else {
          result.unknownFields.push(`${sectionName}.${key}`);
        }
      }

      if (Object.keys(section).length > 0) {
        result.kpis[sectionName] = section;
      }
    }

    return result;
  }

  // Flat format: resolve each key and group by section
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;

    const def = resolveKey(key);
    if (def) {
      if (!result.kpis[def.schemaSection]) {
        result.kpis[def.schemaSection] = {};
      }
      (result.kpis[def.schemaSection] as Record<string, unknown>)[
        def.schemaKey
      ] = value;

      result.mappedFields.push({
        original: key,
        schemaKey: def.schemaKey,
        section: def.schemaSection,
        kpiNumber: def.number,
      });
    } else {
      result.unknownFields.push(key);
    }
  }

  return result;
}
