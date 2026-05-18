import type { C1Input, C1ValueType } from "./c1-input";
import { SCHEMA_KEY_MAP } from "./registry";
import type {
  KPIValueElement,
  KPIValueList,
  KpiData,
  KpiSectionName,
} from "./schema";

export interface EnrichmentContext {
  userId: string;
  submittedAt?: string;
}

export function enrichKpiInput(
  input: C1Input,
  context: EnrichmentContext,
): KpiData {
  const submittedAt = context.submittedAt ?? new Date().toISOString();
  const result: KpiData = {};

  if (input.asset_id) {
    result.AssetID = input.asset_id;
  }

  for (const [sectionName, kpis] of Object.entries(input.kpis)) {
    if (!kpis) continue;

    const section: Record<string, KPIValueElement | KPIValueList> = {};

    for (const [kpiKey, rawValue] of Object.entries(kpis)) {
      const def = SCHEMA_KEY_MAP.get(kpiKey);
      if (!def) continue;

      if (def.elementType === "KPIValueList") {
        section[kpiKey] = enrichAsValueList(
          rawValue,
          context.userId,
          submittedAt,
        );
      } else if (kpiKey === "KPI_7_2_Energy_Class") {
        section[kpiKey] = enrichAsEnergyClass(
          rawValue,
          context.userId,
          submittedAt,
        );
      } else {
        section[kpiKey] = enrichAsValueElement(
          rawValue,
          context.userId,
          submittedAt,
        );
      }
    }

    if (Object.keys(section).length > 0) {
      (result as Record<string, unknown>)[sectionName as KpiSectionName] =
        section;
    }
  }

  return result;
}

function enrichAsValueElement(
  raw: C1ValueType,
  userId: string,
  submittedAt: string,
): KPIValueElement {
  let value: string | number | boolean;
  let additionalInfo: string | undefined;

  if (typeof raw === "object" && raw !== null && "value" in raw) {
    value = (raw as { value: string }).value;
  } else if (typeof raw === "object" && raw !== null && "values" in raw) {
    const arr = raw as { values: (string | number | boolean)[] };
    value = arr.values[0] ?? "";
  } else {
    value = raw as string | number | boolean;
  }

  if (
    typeof raw === "object" &&
    raw !== null &&
    "additional_information" in raw
  ) {
    additionalInfo = (raw as { additional_information?: string })
      .additional_information;
  }

  const element: KPIValueElement = {
    Value: value,
    SubmittedBy: userId,
    SubmittetedAt: submittedAt,
    Secret: "",
    Source: "input",
    History: [],
  };

  if (additionalInfo !== undefined) {
    element.AdditionalInformation = additionalInfo;
  }

  return element;
}

function enrichAsValueList(
  raw: C1ValueType,
  userId: string,
  submittedAt: string,
): KPIValueList {
  let values: (string | number | boolean)[];
  let additionalInfo: string | undefined;

  if (typeof raw === "object" && raw !== null && "values" in raw) {
    const arr = raw as {
      values: (string | number | boolean)[];
      additional_information?: string;
    };
    values = arr.values;
    additionalInfo = arr.additional_information;
  } else if (Array.isArray(raw)) {
    values = raw;
  } else {
    values = [raw as string | number | boolean];
  }

  const element: KPIValueList = {
    Values: values,
    SubmittedBy: userId,
    SubmittetedAt: submittedAt,
    Secret: "",
    Source: "input",
    History: [],
  };

  if (additionalInfo !== undefined) {
    element.AdditionalInformation = additionalInfo;
  }

  return element;
}

function enrichAsEnergyClass(
  raw: C1ValueType,
  userId: string,
  submittedAt: string,
): KPIValueElement {
  let value: string;
  let source: string;

  if (
    typeof raw === "object" &&
    raw !== null &&
    "value" in raw &&
    "source" in raw
  ) {
    const ec = raw as { value: string; source: string };
    value = ec.value;
    source = ec.source;
  } else {
    value = String(raw);
    source = "andere";
  }

  return {
    Value: value,
    SubmittedBy: userId,
    SubmittetedAt: submittedAt,
    Secret: "",
    Source: source as KPIValueElement["Source"],
    History: [],
  };
}
