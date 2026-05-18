import { z } from "zod";
import { EnergyClassSourceSchema } from "./schema";

const C1ScalarValue = z.union([z.string(), z.number(), z.boolean()]);

const C1ArrayValue = z.object({
  values: z.array(z.union([z.string(), z.number(), z.boolean()])),
  additional_information: z.string().optional(),
});

const C1EnergyClassValue = z.object({
  value: z.string(),
  source: EnergyClassSourceSchema,
});

const C1Value = z.union([C1ScalarValue, C1ArrayValue, C1EnergyClassValue]);

const C1SectionSchema = z.record(z.string(), C1Value);

export const C1InputSchema = z.object({
  asset_id: z.string().optional(),
  external_id: z.string().optional(),
  schema_version: z.literal("0.9.0"),
  kpis: z.object({
    Property_Related_Data: C1SectionSchema.optional(),
    Energy_Performance: C1SectionSchema.optional(),
    Energy_Consumption: C1SectionSchema.optional(),
    Greenhouse_Gases: C1SectionSchema.optional(),
  }),
});

export type C1Input = z.infer<typeof C1InputSchema>;
export type C1ValueType = z.infer<typeof C1Value>;
