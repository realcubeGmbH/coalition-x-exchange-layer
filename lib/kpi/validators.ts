/**
 * KPI Dependency Validators
 * Implements subset dependency logic based on:
 * 1. Building Type (Residential / Non-Residential)
 * 2. Building State (New / Existing / Renovation)
 * 3. EPC Type (Consumption-based / Demand-based)
 * 
 * Based on RelevantFor_* flags in the flat JSON schema descriptions
 */

import type { FlatKpiInput } from "./schema";

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
  activityInValueChain: "CONSTRUCTION" | "EXISTING_BUILDING" | "RENOVATION" | "DEMOLITION" | null;
  epcType: "CONSUMPTION_BASED" | "DEMAND_BASED" | "NO_OBLIGATION" | "NON_EXISTENT" | null;
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
// Field Relevance Rules (from flat JSON descriptions)
// =============================================================================

interface FieldRelevance {
  relevantForNewBuildings: boolean;
  relevantForExistingBuildings: boolean;
  relevantForRenovation: boolean;
  relevantForDemolition: boolean;
  relevantForResidential: boolean;
  relevantForNonResidential: boolean;
  optional?: string; // Condition for optional
  requiresConsumptionBasedEpc?: boolean;
  requiresDemandBasedEpc?: boolean;
}

const FIELD_RELEVANCE: Record<string, FieldRelevance> = {
  // KPI 1-1: Building Permit Date
  Building_Permit_Date_Of_Building_Permit_Application: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: false,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    optional: "Data point obsolete if KPI 6-1 is met (taxonomy aligned)",
  },
  
  // KPI 1-2: Year of Construction
  Building_Permit_Year_Of_Construction: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: false,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
  },
  
  // KPI 3-1: Primary Use of Building
  Building_Use_Type_Primary_Use_Of_Building: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
  },
  
  // KPI 4-1: Fossil Fuels Usage
  Use_For_Fossil_Fuels_Usage_For_Extraction_Storage_Transport_Or_Manufacture_Of_Fossil_Fuels: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: false, // Only for non-residential
    relevantForNonResidential: true,
  },
  
  // KPI 5-1: Usable Area (heated/cooled) - Residential
  Surface_Measure_Usable_Area_heated_Or_Cooled: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true, // Only for residential
    relevantForNonResidential: false,
  },
  
  // KPI 5-2: Useful Internal Floor Area - Non-Residential
  Surface_Measure_Useful_Internal_Floor_Area_heated_Or_Cooled: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: false, // Only for non-residential
    relevantForNonResidential: true,
  },
  
  // KPI 5-3: Gross External Area (IPMS 1)
  Surface_Measure_Gross_External_Area_IPMS_1: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    optional: "If available",
  },
  
  // KPI 5-4: Total Gross Internal Area (IPMS 2)
  Surface_Measure_Total_Gross_Internal_Area_IPMS_2: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: false,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    optional: "If available",
  },
  
  // KPI 5-5: Rental Area
  Surface_Measure_Rental_Area: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    optional: "If available",
  },
  
  // KPI 6-1: Taxonomy Alignment
  Taxonomy_Alignment_Object_Activity_Is_Taxonomy_Aligned: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: true,
    relevantForResidential: true,
    relevantForNonResidential: true,
  },
  
  // KPI 7-1: EPC File
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
  },
  
  // KPI 7-2: EPC Class
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Class: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    optional: "Only required if no digitally readable EPC is available",
  },
  
  // KPI 7-3: Primary Energy Consumption (Consumption-based EPC)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Consumption: {
    relevantForNewBuildings: false,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    requiresConsumptionBasedEpc: true,
    optional: "Only required for consumption-based EPC without digital file",
  },
  
  // KPI 7-4: Primary Energy Demand (Demand-based EPC)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Demand: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    requiresDemandBasedEpc: true,
    optional: "Only required for demand-based EPC without digital file",
  },
  
  // KPI 7-5: End Energy Consumption (Consumption-based EPC)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Consumption: {
    relevantForNewBuildings: false,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    requiresConsumptionBasedEpc: true,
    optional: "Only required for consumption-based EPC without digital file",
  },
  
  // KPI 7-6: End Energy Demand (Demand-based EPC)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Demand: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    requiresDemandBasedEpc: true,
    optional: "Only required for demand-based EPC without digital file",
  },
  
  // KPI 7-7: EPC Expiry Date
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Expiry_Date: {
    relevantForNewBuildings: false,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
    optional: "Only required if no digitally readable EPC is available",
  },
  
  // KPI 7-8: EPC Type
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Type: {
    relevantForNewBuildings: false,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
  },
  
  // KPI 8-1: Heating Medium
  Energy_Consumption_Heating_Medium: {
    relevantForNewBuildings: true,
    relevantForExistingBuildings: true,
    relevantForRenovation: true,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
  },
  
  // KPI 9-1: Direct GHG Emissions
  GHG_Emissions_Direct_GHG_Emissions_Generated_In_On_Real_Estate_Asset: {
    relevantForNewBuildings: false,
    relevantForExistingBuildings: true,
    relevantForRenovation: false,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
  },
  
  // KPI 9-2: Indirect GHG Emissions from Energy
  GHG_Emissions_Indirect_GHG_Emissions_Generated_From_Energy_Usage_In_On_Real_Estate_Asset: {
    relevantForNewBuildings: false,
    relevantForExistingBuildings: true,
    relevantForRenovation: false,
    relevantForDemolition: false,
    relevantForResidential: true,
    relevantForNonResidential: true,
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

function deriveContext(data: FlatKpiInput): ValidationContext {
  // Determine building category from primary use
  let buildingCategory: "RESIDENTIAL" | "NON_RESIDENTIAL" | null = null;
  
  if (data.building_category) {
    buildingCategory = data.building_category;
  } else if (data.Building_Use_Type_Primary_Use_Of_Building) {
    buildingCategory = data.Building_Use_Type_Primary_Use_Of_Building === "RESIDENTIAL" 
      ? "RESIDENTIAL" 
      : "NON_RESIDENTIAL";
  }
  
  // Get activity in value chain
  const activityInValueChain = data.activity_in_value_chain || null;
  
  // Get EPC type
  const epcType = data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Type || null;
  
  // Check if taxonomy aligned
  const taxonomyAligned = data.Taxonomy_Alignment_Object_Activity_Is_Taxonomy_Aligned !== "NO" &&
    data.Taxonomy_Alignment_Object_Activity_Is_Taxonomy_Aligned !== undefined;
  
  // Check if digital EPC is available
  const hasDigitalEpc = !!data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC;
  
  return {
    buildingCategory,
    activityInValueChain,
    epcType,
    taxonomyAligned,
    hasDigitalEpc,
  };
}

function isFieldRelevant(
  fieldName: string,
  context: ValidationContext,
  relevance: FieldRelevance
): boolean {
  // Check building state relevance
  if (context.activityInValueChain) {
    const stateRelevant = 
      (context.activityInValueChain === "CONSTRUCTION" && relevance.relevantForNewBuildings) ||
      (context.activityInValueChain === "EXISTING_BUILDING" && relevance.relevantForExistingBuildings) ||
      (context.activityInValueChain === "RENOVATION" && relevance.relevantForRenovation) ||
      (context.activityInValueChain === "DEMOLITION" && relevance.relevantForDemolition);
    
    if (!stateRelevant) return false;
  }
  
  // Check building category relevance
  if (context.buildingCategory) {
    const categoryRelevant = 
      (context.buildingCategory === "RESIDENTIAL" && relevance.relevantForResidential) ||
      (context.buildingCategory === "NON_RESIDENTIAL" && relevance.relevantForNonResidential);
    
    if (!categoryRelevant) return false;
  }
  
  // Check EPC type relevance
  if (context.epcType) {
    if (relevance.requiresConsumptionBasedEpc && context.epcType !== "CONSUMPTION_BASED") {
      return false;
    }
    if (relevance.requiresDemandBasedEpc && context.epcType !== "DEMAND_BASED") {
      return false;
    }
  }
  
  return true;
}

function isFieldOptional(
  fieldName: string,
  context: ValidationContext,
  relevance: FieldRelevance
): boolean {
  // Fields marked with "If available" are always optional
  if (relevance.optional?.includes("If available")) {
    return true;
  }
  
  // KPI 1-1 is optional if taxonomy aligned
  if (fieldName === "Building_Permit_Date_Of_Building_Permit_Application" && context.taxonomyAligned) {
    return true;
  }
  
  // EPC detail fields (7-2 to 7-7) are optional if digital EPC is available
  if (relevance.optional?.includes("no digitally readable EPC") && context.hasDigitalEpc) {
    return true;
  }
  
  return false;
}

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Validate KPI data against subset dependency rules
 */
export function validateDependencies(data: FlatKpiInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const context = deriveContext(data);
  
  // Create a plain object for iteration - spread assigns to Record<string, unknown> cleanly
  const dataRecord: Record<string, unknown> = { ...data };
  
  // Check each field
  for (const [fieldName, relevance] of Object.entries(FIELD_RELEVANCE)) {
    const value = dataRecord[fieldName];
    const hasValue = value !== undefined && value !== null && value !== "";
    
    // Check if field is relevant to this context
    const isRelevant = isFieldRelevant(fieldName, context, relevance);
    const isOptional = isFieldOptional(fieldName, context, relevance);
    
    // If field is required (relevant and not optional) but missing
    if (isRelevant && !isOptional && !hasValue) {
      errors.push({
        field: fieldName,
        code: "REQUIRED_FIELD_MISSING",
        message: `${fieldName} is required based on the building context`,
        severity: "error",
      });
    }
    
    // If field is provided but not relevant (warning only)
    if (!isRelevant && hasValue) {
      warnings.push({
        field: fieldName,
        code: "FIELD_NOT_RELEVANT",
        message: `${fieldName} is not relevant for this building type/state and will be ignored`,
        severity: "warning",
      });
    }
  }
  
  // Cross-field validations
  
  // EPC consumption fields required for consumption-based EPC
  if (context.epcType === "CONSUMPTION_BASED" && !context.hasDigitalEpc) {
    if (!data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Consumption) {
      errors.push({
        field: "Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Consumption",
        code: "EPC_CONSUMPTION_REQUIRED",
        message: "Primary energy consumption is required for consumption-based EPC without digital file",
        severity: "error",
      });
    }
  }
  
  // EPC demand fields required for demand-based EPC
  if (context.epcType === "DEMAND_BASED" && !context.hasDigitalEpc) {
    if (!data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Demand) {
      errors.push({
        field: "Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Demand",
        code: "EPC_DEMAND_REQUIRED",
        message: "Primary energy demand is required for demand-based EPC without digital file",
        severity: "error",
      });
    }
  }
  
  // At least one surface measure required
  const hasSurfaceMeasure = 
    data.Surface_Measure_Usable_Area_heated_Or_Cooled ||
    data.Surface_Measure_Useful_Internal_Floor_Area_heated_Or_Cooled ||
    data.Surface_Measure_Gross_External_Area_IPMS_1 ||
    data.Surface_Measure_Total_Gross_Internal_Area_IPMS_2 ||
    data.Surface_Measure_Rental_Area;
  
  if (!hasSurfaceMeasure && context.activityInValueChain !== "DEMOLITION") {
    warnings.push({
      field: "Surface_Measure",
      code: "NO_SURFACE_MEASURE",
      message: "At least one surface measure is recommended",
      severity: "warning",
    });
  }
  
  // GHG data requires year
  if ((data.GHG_Emissions_Direct_GHG_Emissions_Generated_In_On_Real_Estate_Asset ||
       data.GHG_Emissions_Indirect_GHG_Emissions_Generated_From_Energy_Usage_In_On_Real_Estate_Asset) &&
      !data.GHG_Emissions_Year) {
    warnings.push({
      field: "GHG_Emissions_Year",
      code: "GHG_YEAR_RECOMMENDED",
      message: "Year is recommended when providing GHG emissions data",
      severity: "warning",
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    context,
  };
}

/**
 * Full validation: Schema + Dependencies
 */
export function validateFlatKpi(rawData: unknown): {
  success: boolean;
  data?: FlatKpiInput;
  errors: ValidationError[];
  warnings: ValidationError[];
  context?: ValidationContext;
} {
  // Import schema dynamically to avoid circular deps
  const { FlatKpiSchema } = require("./schema");
  
  // Step 1: Schema validation
  const schemaResult = FlatKpiSchema.safeParse(rawData);
  
  if (!schemaResult.success) {
    const schemaErrors: ValidationError[] = schemaResult.error.issues.map((err: { path: (string | number)[]; message: string }) => ({
      field: err.path.join("."),
      code: "SCHEMA_VALIDATION_ERROR",
      message: err.message,
      severity: "error" as const,
    }));
    
    return {
      success: false,
      errors: schemaErrors,
      warnings: [],
    };
  }
  
  // Step 2: Dependency validation
  const dependencyResult = validateDependencies(schemaResult.data);
  
  return {
    success: dependencyResult.valid,
    data: schemaResult.data,
    errors: dependencyResult.errors,
    warnings: dependencyResult.warnings,
    context: dependencyResult.context,
  };
}

