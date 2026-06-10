/**
 * KPI Validators
 *
 * V0.9.2 dependency validation that operates on enriched KPI data,
 * unwrapping .Value from element wrappers.
 */

import type {
  KpiData,
  KPIValueElement,
  KPIValueList,
  KPIValueElementUseofBuilding,
} from "./schema";

// =============================================================================
// Types
// =============================================================================

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationContext {
  buildingCategory: "RESIDENTIAL" | "NON_RESIDENTIAL" | null;
  activityInValueChain:
    | "CONSTRUCTION"
    | "EXISTING_BUILDING"
    | "RENOVATION"
    | "DEMOLITION"
    | null;
  epcType:
    | "CONSUMPTION_BASED"
    | "DEMAND_BASED"
    | "NO_OBLIGATION"
    | "NON_EXISTENT"
    | null;
  taxonomyAligned: boolean;
  hasDigitalEpc: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  context: ValidationContext;
}

// =============================================================================
// Helpers
// =============================================================================

type KpiElement = KPIValueElement | KPIValueList | KPIValueElementUseofBuilding;

function unwrapValue(element: KpiElement | undefined): unknown {
  if (!element) return undefined;
  if ("Value" in element) return element.Value;
  if ("Values" in element) return element.Values;
  return undefined;
}

// =============================================================================
// V0.9.2 Dependency Validation
// =============================================================================

/**
 * Validate V0.9.2 KPI data against subset dependency rules.
 * Unwraps .Value/.Values from element wrappers.
 */
export function validateDependencies(data: KpiData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const prop = data.Property_Related_Data;
  const energy = data.Energy_Performance;

  const buildingUse = unwrapValue(prop?.KPI_3_1_Main_Use_Of_Building) as
    | string
    | undefined;
  const buildingCategory: "RESIDENTIAL" | "NON_RESIDENTIAL" | null =
    buildingUse === "Wohnen"
      ? "RESIDENTIAL"
      : buildingUse
        ? "NON_RESIDENTIAL"
        : null;

  const epcType = unwrapValue(energy?.KPI_7_8_EPC_Type) as string | undefined;

  const hasSurfaceMeasure =
    unwrapValue(prop?.KPI_5_1_Usage_Area_ThermalyConditioned_Residential) !==
      undefined ||
    unwrapValue(
      prop?.KPI_5_2_NetFloorArea_ThermalyConditioned_NonResidential,
    ) !== undefined ||
    unwrapValue(prop?.KPI_5_3_GrossExternalArea) !== undefined ||
    unwrapValue(prop?.KPI_5_4_GrossInternalArea) !== undefined ||
    unwrapValue(prop?.KPI_5_5_Rental_Area) !== undefined;

  if (!hasSurfaceMeasure && prop && Object.keys(prop).length > 0) {
    warnings.push({
      field: "Property_Related_Data.Surface_Measure",
      code: "NO_SURFACE_MEASURE",
      message: "At least one surface measure is recommended",
      severity: "warning",
    });
  }

  const context: ValidationContext = {
    buildingCategory,
    activityInValueChain: null,
    epcType: (epcType as ValidationContext["epcType"]) ?? null,
    taxonomyAligned: false,
    hasDigitalEpc:
      unwrapValue(energy?.KPI_7_1_Energy_Performance_Certificate) !== undefined,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    context,
  };
}
