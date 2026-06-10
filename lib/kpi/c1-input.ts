import { z } from "zod";
import { EnergyClassSourceSchema } from "./schema";

const C1ScalarValue = z.union([z.string(), z.number(), z.boolean()]);

const C1ArrayValue = z.object({
  values: z.array(z.union([z.string(), z.number(), z.boolean()])),
  additional_information: z.string().optional(),
  reason_for_change: z.string().optional(),
});

const C1EnergyClassValue = z.object({
  value: z.string(),
  source: EnergyClassSourceSchema,
  reason_for_change: z.string().optional(),
});

const C1EnergyDataItem = z.object({
  energy_carrier: z.string().optional(),
  total_value: z.number().optional(),
  heating: z.number().optional(),
  domestic_hot_water: z.number().optional(),
  cooling: z.number().optional(),
  lighting: z.number().optional(),
  ventilation: z.number().optional(),
  additional_electricity_demand: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  conversion_factor_primary_energy: z.number().optional(),
  values_based_on_inferior_heating_value: z.boolean().optional(),
});

const C1EnergyTableValue = z.object({
  values: z.array(C1EnergyDataItem),
  additional_information: z.string().optional(),
  reason_for_change: z.string().optional(),
});

const C1Value = z.union([
  C1ScalarValue,
  C1ArrayValue,
  C1EnergyClassValue,
  C1EnergyTableValue,
]);

const C1SectionSchema = z.record(z.string(), C1Value);

export const C1InputSchema = z.object({
  asset_id: z.string().optional(),
  external_id: z.string().optional(),
  schema_version: z.literal("0.9.2"),
  kpis: z.object({
    Property_Related_Data: C1SectionSchema.optional(),
    Energy_Performance: C1SectionSchema.optional(),
    Energy_Consumption: C1SectionSchema.optional(),
    Greenhouse_Gases: C1SectionSchema.optional(),
  }),
});

export type C1Input = z.infer<typeof C1InputSchema>;
export type C1ValueType = z.infer<typeof C1Value>;
export type C1EnergyDataItemType = z.infer<typeof C1EnergyDataItem>;
