/**
 * KPI Module Exports
 *
 * V0.9.0 — Rich KPI objects with metadata, enrichment, and merge
 */

// Core registry
export * from "./registry";

// V0.9.0 schemas
export * from "./schema";

// Input normalization (kpi_1-1, 1-1, field names → V0.9.0 section/key)
export * from "./normalizer";

// C1 input parsing
export * from "./c1-input";

// Server-side enrichment
export * from "./enricher";

// Merge logic
export * from "./merger";

// Validation
export * from "./validators";

// Building scenarios & initial submission enforcement
export * from "./scenarios";

// Services
export * from "./KpiService";
export * from "./SchemaService";
