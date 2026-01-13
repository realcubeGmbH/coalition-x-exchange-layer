/**
 * KPI Module Exports
 *
 * Schema Version: 2.0
 *
 * Input Formats (per Connector 1 AC3):
 * - API format: { "kpi_1-1": "2025-10-15" }
 * - Number format: { "1-1": "2025-10-15" }
 * - Internal format: { "Building_Permit_...": "2025-10-15" }
 */

// Core registry and normalization
export * from "./registry";
export * from "./normalizer";

// Schema and validation
export * from "./schema";
export * from "./validators";
export * from "./transformer";

// Services
export * from "./KpiService";
export * from "./SchemaService";

