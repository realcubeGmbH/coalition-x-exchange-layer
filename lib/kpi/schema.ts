/**
 * KPI Validation Schema
 * Based on CoalitionX_BasicListOfKPIs_Flat.JSON (21 Basic KPIs)
 * 
 * Schema Version: 1.0
 */

import { z } from "zod";

// =============================================================================
// Enums matching the database schema
// =============================================================================

export const BuildingUseTypeEnum = z.enum([
  "RESIDENTIAL",
  "RETAIL", 
  "OFFICE",
  "HOTEL_ACCOMMODATION_GASTRONOMY",
  "HEALTHCARE_SOCIAL",
  "INDUSTRIAL_LOGISTICS",
  "INFRASTRUCTURE",
  "RECREATION_CULTURE_EDUCATION",
  "MIXED_USE",
  "OTHER",
]);

export const ActivityInValueChainEnum = z.enum([
  "CONSTRUCTION",       // New Building
  "EXISTING_BUILDING",  // Existing
  "RENOVATION",         // Renovation
  "DEMOLITION",         // Demolition
]);

export const TaxonomyAlignmentEnum = z.enum([
  "YES_CA",  // Climate Adaptation
  "YES_CE",  // Circular Economy
  "YES_CM",  // Climate Mitigation
  "NO",
]);

export const EPCTypeEnum = z.enum([
  "CONSUMPTION_BASED",
  "DEMAND_BASED",
  "NO_OBLIGATION",
  "NON_EXISTENT",
]);

export const HeatingMediumEnum = z.enum([
  "DISTRICT_HEATING",
  "GAS",
  "OIL",
  "ELECTRICITY",
  "HEAT_PUMP",
  "HYBRID",
]);

export const BuildingCategoryEnum = z.enum([
  "RESIDENTIAL",
  "NON_RESIDENTIAL",
]);

export const FossilFuelsBasisEnum = z.enum([
  "BY_NET_BASE_RENT",
  "BY_REAL_ESTATE_VALUE",
]);

// =============================================================================
// Field name mappings: Flat JSON → Database
// =============================================================================

export const FLAT_TO_DB_MAPPING = {
  // Context fields (not KPIs, but needed for validation)
  activity_in_value_chain: "propertyData.activityInValueChain",
  building_category: "propertyData.buildingCategory",
  
  // KPI 1: Building Permit
  Building_Permit_Date_Of_Building_Permit_Application: "propertyData.dateBuildingPermitApplication",
  Building_Permit_Year_Of_Construction: "propertyData.yearOfConstruction",
  
  // KPI 3: Building Use Type
  Building_Use_Type_Primary_Use_Of_Building: "propertyData.primaryUseOfBuilding",
  
  // KPI 4: Fossil Fuels
  Use_For_Fossil_Fuels_Usage_For_Extraction_Storage_Transport_Or_Manufacture_Of_Fossil_Fuels: "propertyData.usageForFossilFuels",
  Use_For_Fossil_Fuels_Basis: "propertyData.fossilFuelsBasis",
  
  // KPI 5: Surface Measures
  Surface_Measure_Usable_Area_heated_Or_Cooled: "propertyData.usableAreaHeated",
  Surface_Measure_Useful_Internal_Floor_Area_heated_Or_Cooled: "propertyData.netFloorAreaHeated",
  Surface_Measure_Gross_External_Area_IPMS_1: "propertyData.grossExternalAreaIPMS1",
  Surface_Measure_Total_Gross_Internal_Area_IPMS_2: "propertyData.totalGrossInternalAreaIPMS2",
  Surface_Measure_Rental_Area: "propertyData.rentalArea",
  
  // KPI 6: Taxonomy Alignment
  Taxonomy_Alignment_Object_Activity_Is_Taxonomy_Aligned: "propertyData.taxonomyAlignment",
  
  // KPI 7: Energy Performance Certificate
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC: "energyPerformance.epcFile",
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Class: "energyPerformance.epcClass",
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Consumption: "energyPerformance.epcPrimaryEnergyConsumption",
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Demand: "energyPerformance.epcPrimaryEnergyDemand",
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Consumption: "energyPerformance.epcEndEnergyConsumption",
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Demand: "energyPerformance.epcEndEnergyDemand",
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Expiry_Date: "energyPerformance.epcExpiryDate",
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Type: "energyPerformance.epcType",
  
  // KPI 8: Energy Consumption
  Energy_Consumption_Heating_Medium: "energyConsumption.heatingMedium",
  
  // KPI 9: GHG Emissions
  GHG_Emissions_Direct_GHG_Emissions_Generated_In_On_Real_Estate_Asset: "greenhouseGases.directGHGEmissions",
  GHG_Emissions_Indirect_GHG_Emissions_Generated_From_Energy_Usage_In_On_Real_Estate_Asset: "greenhouseGases.indirectGHGEmissionsFromEnergy",
} as const;

// =============================================================================
// Base Flat KPI Schema (all fields optional for partial submissions)
// =============================================================================

export const FlatKpiSchema = z.object({
  // Schema version for compatibility tracking
  schema_version: z.string().default("1.0"),
  
  // Context fields (determines validation rules)
  activity_in_value_chain: ActivityInValueChainEnum.optional(),
  building_category: BuildingCategoryEnum.optional(),
  
  // KPI 1-1: Date of building permit application (date)
  Building_Permit_Date_Of_Building_Permit_Application: z.string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date format. Use ISO 8601 (YYYY-MM-DD)",
    })
    .optional(),
  
  // KPI 1-2: Year of construction (year as number or string)
  Building_Permit_Year_Of_Construction: z.union([
    z.number().int().min(1800).max(2100),
    z.string().regex(/^\d{4}$/).transform(Number),
  ]).optional(),
  
  // KPI 3-1: Primary use of building
  Building_Use_Type_Primary_Use_Of_Building: BuildingUseTypeEnum.optional(),
  
  // KPI 4-1: Usage for fossil fuels (percentage)
  Use_For_Fossil_Fuels_Usage_For_Extraction_Storage_Transport_Or_Manufacture_Of_Fossil_Fuels: z.union([
    z.number().min(0).max(100),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 4-1 basis
  Use_For_Fossil_Fuels_Basis: FossilFuelsBasisEnum.optional(),
  
  // KPI 5-1: Usable area heated or cooled (m²)
  Surface_Measure_Usable_Area_heated_Or_Cooled: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 5-2: Useful internal floor area (m²)
  Surface_Measure_Useful_Internal_Floor_Area_heated_Or_Cooled: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 5-3: Gross external area IPMS 1 (m²)
  Surface_Measure_Gross_External_Area_IPMS_1: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 5-4: Total gross internal area IPMS 2 (m²)
  Surface_Measure_Total_Gross_Internal_Area_IPMS_2: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 5-5: Rental area (m²)
  Surface_Measure_Rental_Area: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 6-1: Taxonomy alignment
  Taxonomy_Alignment_Object_Activity_Is_Taxonomy_Aligned: TaxonomyAlignmentEnum.optional(),
  
  // KPI 7-1: EPC file (URL or base64)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC: z.string().optional(),
  
  // KPI 7-2: EPC Class (A+, A, B, C, D, E, F, G, H)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Class: z.string()
    .regex(/^[A-H]\+?$/, { message: "Invalid EPC class. Use A+, A, B, C, D, E, F, G, or H" })
    .optional(),
  
  // KPI 7-3: Primary energy consumption (kWh/m²a)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Consumption: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 7-4: Primary energy demand (kWh/m²a)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Demand: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 7-5: End energy consumption (kWh/m²a)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Consumption: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 7-6: End energy demand (kWh/m²a)
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Demand: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 7-7: EPC expiry date
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Expiry_Date: z.string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date format. Use ISO 8601 (YYYY-MM-DD)",
    })
    .optional(),
  
  // KPI 7-8: EPC Type
  Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Type: EPCTypeEnum.optional(),
  
  // KPI 8-1: Heating medium
  Energy_Consumption_Heating_Medium: HeatingMediumEnum.optional(),
  
  // KPI 8 optional: Year for consumption data
  Energy_Consumption_Year: z.number().int().min(2000).max(2100).optional(),
  
  // KPI 9-1: Direct GHG emissions (t CO2e p.a.)
  GHG_Emissions_Direct_GHG_Emissions_Generated_In_On_Real_Estate_Asset: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 9-2: Indirect GHG emissions from energy (t CO2e p.a.)
  GHG_Emissions_Indirect_GHG_Emissions_Generated_From_Energy_Usage_In_On_Real_Estate_Asset: z.union([
    z.number().min(0),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  
  // KPI 9 optional: Year for GHG data
  GHG_Emissions_Year: z.number().int().min(2000).max(2100).optional(),
});

export type FlatKpiInput = z.infer<typeof FlatKpiSchema>;

// =============================================================================
// Batch submission schema
// =============================================================================

export const BatchKpiSubmissionSchema = z.object({
  schema_version: z.string().default("1.0"),
  buildings: z.array(
    z.object({
      external_id: z.string().min(1, "external_id is required for batch submissions"),
      kpis: FlatKpiSchema,
    })
  ).min(1).max(100, "Maximum 100 buildings per batch"),
});

export type BatchKpiSubmissionInput = z.infer<typeof BatchKpiSubmissionSchema>;

// =============================================================================
// Single building submission schema (with optional building metadata)
// =============================================================================

export const SingleKpiSubmissionSchema = z.object({
  schema_version: z.string().default("1.0"),
  building_id: z.string().optional(), // Existing building ID
  external_id: z.string().optional(), // Partner's external ID
  name: z.string().optional(),
  address: z.string().optional(),
  kpis: FlatKpiSchema,
});

export type SingleKpiSubmissionInput = z.infer<typeof SingleKpiSubmissionSchema>;

// Schema version constant
export const SCHEMA_VERSION = "1.0";

