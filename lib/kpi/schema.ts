import { z } from "zod";

// =============================================================================
// Source Enums (per V0.9.0 JSON schema)
// =============================================================================

export const KpiSourceSchema = z.enum(["input", "computed", "evaluated"]);
export type KpiSource = z.infer<typeof KpiSourceSchema>;

export const EnergyClassSourceSchema = z.enum([
  "Energieausweis",
  "FraunhoferMethode",
  "BVI",
  "andere",
]);
export type EnergyClassSource = z.infer<typeof EnergyClassSourceSchema>;

// =============================================================================
// Value Enums
// =============================================================================

export const BuildingUseEnum = z.enum([
  "Wohnen",
  "Handel",
  "Büro",
  "Hotel",
  "Beherbergung und Gastronomie",
  "Gesundheit und Soziales",
  "Industrie und Logistik",
  "Infrastruktur (Energie/Wasser, Kommunikation, Verkehr)",
  "Freizeit",
  "Kultur und Bildung",
  "Mixed-Use",
  "Andere",
]);

export const EnergyClassEnum = z.enum([
  "A+",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "Unbekannt",
]);

// =============================================================================
// KPIValueElement — scalar KPIs (self-referential History per V0.9.0 schema)
// =============================================================================

export type KPIValueElement = {
  Value: string | number | boolean;
  SubmittedBy: string;
  SubmittetedAt: string;
  Secret: string;
  AdditionalInformation?: string;
  Source?: KpiSource;
  History?: KPIValueElement[];
};

export const KPIValueElementSchema: z.ZodType<KPIValueElement> = z.lazy(() =>
  z.object({
    Value: z.union([z.string(), z.number(), z.boolean()]),
    SubmittedBy: z.string(),
    SubmittetedAt: z.string().datetime(),
    Secret: z.string(),
    AdditionalInformation: z.string().optional(),
    Source: KpiSourceSchema.optional(),
    History: z.array(KPIValueElementSchema).optional(),
  }),
);

// =============================================================================
// KPIValueList — array KPIs (self-referential History per V0.9.0 schema)
// =============================================================================

export type KPIValueList = {
  Values: Array<string | number | boolean>;
  SubmittedBy: string;
  SubmittetedAt: string;
  Secret: string;
  AdditionalInformation?: string;
  Source?: KpiSource;
  History?: KPIValueList[];
};

export const KPIValueListSchema: z.ZodType<KPIValueList> = z.lazy(() =>
  z.object({
    Values: z.array(z.union([z.string(), z.number(), z.boolean()])),
    SubmittedBy: z.string(),
    SubmittetedAt: z.string().datetime(),
    Secret: z.string(),
    AdditionalInformation: z.string().optional(),
    Source: KpiSourceSchema.optional(),
    History: z.array(KPIValueListSchema).optional(),
  }),
);

// =============================================================================
// KPIValueElementUseofBuilding — KPI 3-1 (enum-restricted Value)
// =============================================================================

export type KPIValueElementUseofBuilding = {
  Value: z.infer<typeof BuildingUseEnum>;
  SubmittedBy: string;
  SubmittetedAt: string;
  Secret: string;
  AdditionalInformation?: string;
  Source?: KpiSource;
  History?: KPIValueElementUseofBuilding[];
};

export const KPIValueElementUseofBuildingSchema: z.ZodType<KPIValueElementUseofBuilding> =
  z.lazy(() =>
    z.object({
      Value: BuildingUseEnum,
      SubmittedBy: z.string(),
      SubmittetedAt: z.string().datetime(),
      Secret: z.string(),
      AdditionalInformation: z.string().optional(),
      Source: KpiSourceSchema.optional(),
      History: z.array(KPIValueElementUseofBuildingSchema).optional(),
    }),
  );

// =============================================================================
// KPIValueElementEnergyClass — KPI 7-2 (enum Value + required Source)
// =============================================================================

export type KPIValueElementEnergyClass = {
  Value: z.infer<typeof EnergyClassEnum>;
  SubmittedBy: string;
  SubmittetedAt: string;
  Secret: string;
  AdditionalInformation?: string;
  Source: EnergyClassSource;
  History?: KPIValueElementEnergyClass[];
};

export const KPIValueElementEnergyClassSchema: z.ZodType<KPIValueElementEnergyClass> =
  z.lazy(() =>
    z.object({
      Value: EnergyClassEnum,
      SubmittedBy: z.string(),
      SubmittetedAt: z.string().datetime(),
      Secret: z.string(),
      AdditionalInformation: z.string().optional(),
      Source: EnergyClassSourceSchema,
      History: z.array(KPIValueElementEnergyClassSchema).optional(),
    }),
  );

// =============================================================================
// Section Schemas (all fields optional — partial submissions)
// =============================================================================

export const PropertyRelatedDataSchema = z.object({
  KPI_1_1_Date_Of_Building_Permit: KPIValueElementSchema.optional(),
  KPI_1_2_Building_Completion_Year: KPIValueElementSchema.optional(),
  KPI_2_1_YearOfLastRetrofit: KPIValueListSchema.optional(),
  KPI_2_2_TypeOfLastRetrofit: KPIValueListSchema.optional(),
  KPI_3_1_Main_Use_Of_Building:
    KPIValueElementUseofBuildingSchema.optional(),
  KPI_4_1_Usage_Of_Fossil_Fuels: KPIValueElementSchema.optional(),
  KPI_5_1_Usage_Area_ThermalyConditioned_Residential:
    KPIValueElementSchema.optional(),
  KPI_5_2_NetFloorArea_ThermalyConditioned_NonResidential:
    KPIValueElementSchema.optional(),
  KPI_5_3_GrossExternalArea: KPIValueElementSchema.optional(),
  KPI_5_4_GrossInternalArea: KPIValueElementSchema.optional(),
  KPI_5_5_Rental_Area: KPIValueElementSchema.optional(),
  KPI_6_1_Object_Is_Taxonomy_Aligned: KPIValueElementSchema.optional(),
});

export const EnergyPerformanceSchema = z.object({
  KPI_7_1_Energy_Performance_Certificate: KPIValueElementSchema.optional(),
  KPI_7_2_Energy_Class: KPIValueElementEnergyClassSchema.optional(),
  KPI_7_3_Primary_Energy_Metered: KPIValueElementSchema.optional(),
  KPI_7_4_Primary_Energy_Calculated: KPIValueElementSchema.optional(),
  KPI_7_5_Delivered_Energy_Metered: KPIValueElementSchema.optional(),
  KPI_7_6_Delivered_Energy_Calculated: KPIValueElementSchema.optional(),
  KPI_7_7_EPC_Expiry_Date: KPIValueElementSchema.optional(),
  KPI_7_8_EPC_Type: KPIValueElementSchema.optional(),
});

export const EnergyConsumptionSchema = z.object({
  KPI_8_1_EnergyCarriersForHeating: KPIValueListSchema.optional(),
  KPI_8_2_MeteredEnergyConsumption: KPIValueListSchema.optional(),
  KPI_8_3_MeteredEnergyConsumptionAsTable: KPIValueListSchema.optional(),
});

export const GreenhouseGasesSchema = z.object({
  KPI_9_1_DirectEmissions: KPIValueListSchema.optional(),
  KPI_9_2_IndirectEmissions: KPIValueListSchema.optional(),
  KPI_9_3_OtherIndirectEmissions: KPIValueListSchema.optional(),
  KPI_9_4_ShareOfEstimatedEmissions: KPIValueElementSchema.optional(),
  KPI_9_5_AreIndirectEmissionsBasedOnMarketOrOnLocation:
    KPIValueElementSchema.optional(),
  KPI_9_6_CO2EmissionsFactorPerCarrier: KPIValueListSchema.optional(),
});

export const ExtendedDataSchema = z.object({
  MaximumPrimaryEnergyDemand_Metered: z.number().optional(),
  MaximumPrimaryEnergyDemand_Calculated: z.number().optional(),
});

export const MetaDataSchema = z.object({
  LocalAssetID: z.string().optional(),
  BuildingName: z.string().optional(),
  BuildingPart: z.string().optional(),
  BuildingStreet: z.string().optional(),
  BuildingNumber: z.string().optional(),
  BuildingPostcode: z.string().optional(),
  BuildingCity: z.string().optional(),
  BuildingState: z.string().optional(),
  BuildingCountry: z.string().optional(),
});

// =============================================================================
// Root Schema (V0.9.0 — all fields optional for partial submissions)
// =============================================================================

export const KpiDataSchema = z.object({
  AssetID: z.string().optional(),
  MetaData: MetaDataSchema.optional(),
  Property_Related_Data: PropertyRelatedDataSchema.optional(),
  Energy_Performance: EnergyPerformanceSchema.optional(),
  Energy_Consumption: EnergyConsumptionSchema.optional(),
  Greenhouse_Gases: GreenhouseGasesSchema.optional(),
  Extended_Data: ExtendedDataSchema.optional(),
});

export type KpiData = z.infer<typeof KpiDataSchema>;

// =============================================================================
// V0.9.0 Section names (for iteration)
// =============================================================================

export const KPI_SECTIONS = [
  "Property_Related_Data",
  "Energy_Performance",
  "Energy_Consumption",
  "Greenhouse_Gases",
] as const;

export type KpiSectionName = (typeof KPI_SECTIONS)[number];
