/**
 * Flat JSON to Database Transformer
 * Maps flat KPI JSON structure to database-compatible records
 * 
 * Note: Since we use KpiRecord with JSON kpiData field,
 * this transformer mainly normalizes and validates the data structure.
 */

import type { FlatKpiInput } from "./schema";

// =============================================================================
// Types
// =============================================================================

export interface TransformResult {
  propertyData: Record<string, unknown>;
  energyPerformance: Record<string, unknown>;
  energyConsumption?: Record<string, unknown>;
  greenhouseGases?: Record<string, unknown>;
}

// =============================================================================
// Enum Value Mapping (JSON → DB)
// =============================================================================

const BUILDING_USE_TYPE_MAP: Record<string, string> = {
  "Residential": "RESIDENTIAL",
  "RESIDENTIAL": "RESIDENTIAL",
  "Retail": "RETAIL",
  "RETAIL": "RETAIL",
  "Office": "OFFICE",
  "OFFICE": "OFFICE",
  "Hotel": "HOTEL_ACCOMMODATION_GASTRONOMY",
  "Hotel, accommodation and gastronomy": "HOTEL_ACCOMMODATION_GASTRONOMY",
  "HOTEL_ACCOMMODATION_GASTRONOMY": "HOTEL_ACCOMMODATION_GASTRONOMY",
  "Healthcare": "HEALTHCARE_SOCIAL",
  "Healthcare and social": "HEALTHCARE_SOCIAL",
  "HEALTHCARE_SOCIAL": "HEALTHCARE_SOCIAL",
  "Industrial": "INDUSTRIAL_LOGISTICS",
  "Industrial and logistics": "INDUSTRIAL_LOGISTICS",
  "INDUSTRIAL_LOGISTICS": "INDUSTRIAL_LOGISTICS",
  "Infrastructure": "INFRASTRUCTURE",
  "INFRASTRUCTURE": "INFRASTRUCTURE",
  "Recreation": "RECREATION_CULTURE_EDUCATION",
  "Recreation, culture and education": "RECREATION_CULTURE_EDUCATION",
  "RECREATION_CULTURE_EDUCATION": "RECREATION_CULTURE_EDUCATION",
  "Mixed-use": "MIXED_USE",
  "MIXED_USE": "MIXED_USE",
  "Other": "OTHER",
  "OTHER": "OTHER",
};

const TAXONOMY_ALIGNMENT_MAP: Record<string, string> = {
  "yes": "YES_CM", // Default to Climate Mitigation
  "YES": "YES_CM",
  "Yes - CA": "YES_CA",
  "Yes - CE": "YES_CE",
  "Yes - CM": "YES_CM",
  "YES_CA": "YES_CA",
  "YES_CE": "YES_CE",
  "YES_CM": "YES_CM",
  "no": "NO",
  "NO": "NO",
};

const EPC_TYPE_MAP: Record<string, string> = {
  "Consumption-based": "CONSUMPTION_BASED",
  "CONSUMPTION_BASED": "CONSUMPTION_BASED",
  "Demand-based": "DEMAND_BASED",
  "DEMAND_BASED": "DEMAND_BASED",
  "No obligation": "NO_OBLIGATION",
  "NO_OBLIGATION": "NO_OBLIGATION",
  "Non-existent": "NON_EXISTENT",
  "NON_EXISTENT": "NON_EXISTENT",
};

const HEATING_MEDIUM_MAP: Record<string, string> = {
  "District heating": "DISTRICT_HEATING",
  "DISTRICT_HEATING": "DISTRICT_HEATING",
  "gas": "GAS",
  "Gas": "GAS",
  "GAS": "GAS",
  "oil": "OIL",
  "Oil": "OIL",
  "OIL": "OIL",
  "electricity": "ELECTRICITY",
  "Electricity": "ELECTRICITY",
  "ELECTRICITY": "ELECTRICITY",
  "heat pump": "HEAT_PUMP",
  "Heat pump": "HEAT_PUMP",
  "HEAT_PUMP": "HEAT_PUMP",
  "hybrid": "HYBRID",
  "Hybrid": "HYBRID",
  "hybrid (heat pump + gas)": "HYBRID",
  "HYBRID": "HYBRID",
};

const FOSSIL_FUELS_BASIS_MAP: Record<string, string> = {
  "net_base_rent": "BY_NET_BASE_RENT",
  "BY_NET_BASE_RENT": "BY_NET_BASE_RENT",
  "real_estate_value": "BY_REAL_ESTATE_VALUE",
  "BY_REAL_ESTATE_VALUE": "BY_REAL_ESTATE_VALUE",
};

const ACTIVITY_IN_VALUE_CHAIN_MAP: Record<string, string> = {
  "Construction": "CONSTRUCTION",
  "New Building": "CONSTRUCTION",
  "CONSTRUCTION": "CONSTRUCTION",
  "Existing Building": "EXISTING_BUILDING",
  "Existing": "EXISTING_BUILDING",
  "EXISTING_BUILDING": "EXISTING_BUILDING",
  "Renovation": "RENOVATION",
  "RENOVATION": "RENOVATION",
  "Demolition": "DEMOLITION",
  "DEMOLITION": "DEMOLITION",
};

const BUILDING_CATEGORY_MAP: Record<string, string> = {
  "Residential": "RESIDENTIAL",
  "RESIDENTIAL": "RESIDENTIAL",
  "Non-residential": "NON_RESIDENTIAL",
  "NON_RESIDENTIAL": "NON_RESIDENTIAL",
};

// =============================================================================
// Helper Functions
// =============================================================================

function mapEnum(value: unknown, mapping: Record<string, string>): string | undefined {
  if (value === undefined || value === null) return undefined;
  const strValue = String(value);
  return mapping[strValue] || strValue;
}

function parseDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? undefined : date;
}

function parseFloatValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

function parseIntValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : Math.floor(num);
}

// =============================================================================
// Main Transformer
// =============================================================================

/**
 * Transform flat KPI JSON to database model inputs
 */
export function transformFlatToDb(data: FlatKpiInput): TransformResult {
  const currentYear = new Date().getFullYear();
  
  // PropertyData (KPI 1, 3, 4, 5, 6)
  const propertyData: Record<string, unknown> = {};
  
  // KPI 1: Building Permit
  if (data.Building_Permit_Date_Of_Building_Permit_Application) {
    propertyData.dateBuildingPermitApplication = parseDate(data.Building_Permit_Date_Of_Building_Permit_Application);
  }
  if (data.Building_Permit_Year_Of_Construction !== undefined) {
    propertyData.yearOfConstruction = parseIntValue(data.Building_Permit_Year_Of_Construction);
  }
  
  // KPI 3: Primary Use
  if (data.Building_Use_Type_Primary_Use_Of_Building) {
    propertyData.primaryUseOfBuilding = mapEnum(data.Building_Use_Type_Primary_Use_Of_Building, BUILDING_USE_TYPE_MAP);
  }
  
  // KPI 4: Fossil Fuels
  if (data.Use_For_Fossil_Fuels_Usage_For_Extraction_Storage_Transport_Or_Manufacture_Of_Fossil_Fuels !== undefined) {
    propertyData.usageForFossilFuels = parseFloatValue(data.Use_For_Fossil_Fuels_Usage_For_Extraction_Storage_Transport_Or_Manufacture_Of_Fossil_Fuels);
  }
  if (data.Use_For_Fossil_Fuels_Basis) {
    propertyData.fossilFuelsBasis = mapEnum(data.Use_For_Fossil_Fuels_Basis, FOSSIL_FUELS_BASIS_MAP);
  }
  
  // KPI 5: Surface Measures
  if (data.Surface_Measure_Usable_Area_heated_Or_Cooled !== undefined) {
    propertyData.usableAreaHeated = parseFloatValue(data.Surface_Measure_Usable_Area_heated_Or_Cooled);
  }
  if (data.Surface_Measure_Useful_Internal_Floor_Area_heated_Or_Cooled !== undefined) {
    propertyData.netFloorAreaHeated = parseFloatValue(data.Surface_Measure_Useful_Internal_Floor_Area_heated_Or_Cooled);
  }
  if (data.Surface_Measure_Gross_External_Area_IPMS_1 !== undefined) {
    propertyData.grossExternalAreaIPMS1 = parseFloatValue(data.Surface_Measure_Gross_External_Area_IPMS_1);
  }
  if (data.Surface_Measure_Total_Gross_Internal_Area_IPMS_2 !== undefined) {
    propertyData.totalGrossInternalAreaIPMS2 = parseFloatValue(data.Surface_Measure_Total_Gross_Internal_Area_IPMS_2);
  }
  if (data.Surface_Measure_Rental_Area !== undefined) {
    propertyData.rentalArea = parseFloatValue(data.Surface_Measure_Rental_Area);
  }
  
  // KPI 6: Taxonomy Alignment
  if (data.Taxonomy_Alignment_Object_Activity_Is_Taxonomy_Aligned) {
    propertyData.taxonomyAlignment = mapEnum(data.Taxonomy_Alignment_Object_Activity_Is_Taxonomy_Aligned, TAXONOMY_ALIGNMENT_MAP);
  }
  
  // Context fields
  if (data.activity_in_value_chain) {
    propertyData.activityInValueChain = mapEnum(data.activity_in_value_chain, ACTIVITY_IN_VALUE_CHAIN_MAP);
  }
  if (data.building_category) {
    propertyData.buildingCategory = mapEnum(data.building_category, BUILDING_CATEGORY_MAP);
  }
  
  // EnergyPerformance (KPI 7)
  const energyPerformance: Record<string, unknown> = {};
  
  if (data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC) {
    energyPerformance.epcFile = data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC;
  }
  if (data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Class) {
    energyPerformance.epcClass = data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Class;
  }
  if (data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Consumption !== undefined) {
    energyPerformance.epcPrimaryEnergyConsumption = parseFloatValue(data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Consumption);
  }
  if (data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Demand !== undefined) {
    energyPerformance.epcPrimaryEnergyDemand = parseFloatValue(data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Primary_Energy_Demand);
  }
  if (data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Consumption !== undefined) {
    energyPerformance.epcEndEnergyConsumption = parseFloatValue(data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Consumption);
  }
  if (data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Demand !== undefined) {
    energyPerformance.epcEndEnergyDemand = parseFloatValue(data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_End_Energy_Demand);
  }
  if (data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Expiry_Date) {
    energyPerformance.epcExpiryDate = parseDate(data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Expiry_Date);
  }
  if (data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Type) {
    energyPerformance.epcType = mapEnum(data.Energy_Performance_Certificate_EPC_Energy_Performance_Certificate_EPC_Type, EPC_TYPE_MAP);
  }
  
  // Calculate total end energy
  if (energyPerformance.epcEndEnergyConsumption !== undefined) {
    energyPerformance.totalEndEnergyConsumption = energyPerformance.epcEndEnergyConsumption;
  }
  if (energyPerformance.epcEndEnergyDemand !== undefined) {
    energyPerformance.totalEndEnergyDemand = energyPerformance.epcEndEnergyDemand;
  }
  
  // Copy building category to energy performance
  if (data.building_category) {
    energyPerformance.buildingCategory = mapEnum(data.building_category, BUILDING_CATEGORY_MAP);
  }
  
  // EnergyConsumption (KPI 8) - optional, time series
  let energyConsumption: Record<string, unknown> | undefined;
  
  if (data.Energy_Consumption_Heating_Medium) {
    energyConsumption = {
      year: data.Energy_Consumption_Year || currentYear,
      heatingMedium: mapEnum(data.Energy_Consumption_Heating_Medium, HEATING_MEDIUM_MAP),
    };
  }
  
  // GreenhouseGases (KPI 9) - optional, time series
  let greenhouseGases: Record<string, unknown> | undefined;
  
  if (data.GHG_Emissions_Direct_GHG_Emissions_Generated_In_On_Real_Estate_Asset !== undefined ||
      data.GHG_Emissions_Indirect_GHG_Emissions_Generated_From_Energy_Usage_In_On_Real_Estate_Asset !== undefined) {
    greenhouseGases = {
      year: data.GHG_Emissions_Year || currentYear,
    };
    
    if (data.GHG_Emissions_Direct_GHG_Emissions_Generated_In_On_Real_Estate_Asset !== undefined) {
      greenhouseGases.directGHGEmissions = parseFloatValue(data.GHG_Emissions_Direct_GHG_Emissions_Generated_In_On_Real_Estate_Asset);
    }
    if (data.GHG_Emissions_Indirect_GHG_Emissions_Generated_From_Energy_Usage_In_On_Real_Estate_Asset !== undefined) {
      greenhouseGases.indirectGHGEmissionsFromEnergy = parseFloatValue(data.GHG_Emissions_Indirect_GHG_Emissions_Generated_From_Energy_Usage_In_On_Real_Estate_Asset);
    }
  }
  
  return {
    propertyData,
    energyPerformance,
    energyConsumption,
    greenhouseGases,
  };
}

/**
 * Helper to filter out undefined values from an object.
 * Returns a new object with only defined properties.
 */
export function removeUndefined(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }
  return result;
}
