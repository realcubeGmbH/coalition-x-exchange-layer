<p align="center">
  <strong>Coalition X</strong><br>
  Multi-tenant SaaS platform for tracking real estate sustainability KPIs based on the ZIA standard.
</p>

<p align="center">
  <a href="https://ibpcoalitionx.azurewebsites.net/swagger/index.html">Swagger</a> &middot;
  <a href="https://zia-deutschland.de/kpi-liste/">ZIA KPI List</a> &middot;
  <a href="#connector-1-developer-guide">Developer Guide</a>
</p>

---

## Connector 1 — Developer Guide

### What is Connector 1?

Connector 1 (C1) is the inbound REST API of the Coalition X Exchange Layer. It is how **Accredited Partners** submit building sustainability KPI data into the platform.

```
                          Coalition X Exchange Layer
                         ┌──────────────────────────────┐
  Partners ──── C1 ────► │  Validate → Enrich → Merge   │
  (you)      (this API)  │           → Store             │
                         └──────────────────────────────┘
```

Partners send a **slim JSON payload** — just KPI keys and their values. The Exchange Layer handles the rest: validation, enrichment with metadata (who submitted, when, provenance), merging with existing data, and version history.

| | |
|---|---|
| **Schema** | V0.9.0 (ZIA Basic Set of KPIs) |
| **Auth** | HTTPS + OAuth 2.0 (JWT) |
| **Format** | JSON — partial submissions allowed, data merges automatically |
| **Single asset** | `POST /api/assets/{asset_id}/kpis` |
| **Batch (up to 100)** | `POST /api/assets/batch` |

---

### Submission Example

```json
{
  "schema_version": "0.9.0",
  "kpis": {
    "Property_Related_Data": {
      "KPI_1_1_Date_Of_Building_Permit": "2020-01-15",
      "KPI_1_2_Building_Completion_Year": 2020,
      "KPI_3_1_Main_Use_Of_Building": "Büro",
      "KPI_5_2_NetFloorArea_ThermalyConditioned_NonResidential": 5000,
      "KPI_6_1_Object_Is_Taxonomy_Aligned": "NO"
    },
    "Energy_Performance": {
      "KPI_7_2_Energy_Class": {
        "value": "B",
        "source": "Energieausweis"
      },
      "KPI_7_4_Primary_Energy_Calculated": 65.2,
      "KPI_7_8_EPC_Type": "DEMAND_BASED"
    },
    "Energy_Consumption": {
      "KPI_8_1_EnergyCarriersForHeating": {
        "values": ["HEAT_PUMP"],
        "additional_information": "Single carrier"
      }
    },
    "Greenhouse_Gases": {
      "KPI_9_1_DirectEmissions": {
        "values": [12.5, 13.2, 11.8],
        "additional_information": "2023, 2024, 2025"
      },
      "KPI_9_2_IndirectEmissions": {
        "values": [22.1, 20.5, 19.8],
        "additional_information": "2023, 2024, 2025"
      }
    }
  }
}
```

**Three payload formats to know:**

| Type | When | Format |
|------|------|--------|
| Scalar | Most KPIs | `"KPI_5_2_...": 5000` |
| Array | KPIs 2-1, 2-2, 8-1 to 8-3, 9-1 to 9-3, 9-6 | `"KPI_9_1_...": { "values": [...], "additional_information": "labels" }` |
| Energy Class | KPI 7-2 only | `"KPI_7_2_...": { "value": "B", "source": "Energieausweis" }` |

You can submit **any subset** of KPIs. Partial submissions merge with existing data — you don't need to send everything at once.

---

### Mandatory KPIs (Basic)

| KPI | Key | What it is | Unit |
|-----|-----|------------|------|
| 1-1 | `KPI_1_1_Date_Of_Building_Permit` | Date of building permit | date |
| 1-2 | `KPI_1_2_Building_Completion_Year` | Year of construction | year |
| 3-1 | `KPI_3_1_Main_Use_Of_Building` | Primary use of building | enum ¹ |
| 4-1 | `KPI_4_1_Usage_Of_Fossil_Fuels` | Fossil fuel usage | % |
| 5-1 | `KPI_5_1_Usage_Area_ThermalyConditioned_Residential` | Usable area — residential | m² |
| 5-2 | `KPI_5_2_NetFloorArea_ThermalyConditioned_NonResidential` | Net floor area — non-residential | m² |
| 5-3 | `KPI_5_3_GrossExternalArea` | Gross external area | m² |
| 5-4 | `KPI_5_4_GrossInternalArea` | Gross internal area | m² |
| 5-5 | `KPI_5_5_Rental_Area` | Rental area | m² |
| 6-1 | `KPI_6_1_Object_Is_Taxonomy_Aligned` | Taxonomy aligned | enum ² |
| 7-1 | `KPI_7_1_Energy_Performance_Certificate` | EPC document | URL/file |
| 7-2 | `KPI_7_2_Energy_Class` | EPC class | enum ³ |
| 7-3 | `KPI_7_3_Primary_Energy_Metered` | Primary energy (metered) | kWh/m²a |
| 7-4 | `KPI_7_4_Primary_Energy_Calculated` | Primary energy (calculated) | kWh/m²a |
| 7-5 | `KPI_7_5_Delivered_Energy_Metered` | End energy (metered) | kWh/m²a |
| 7-6 | `KPI_7_6_Delivered_Energy_Calculated` | End energy (calculated) | kWh/m²a |
| 7-7 | `KPI_7_7_EPC_Expiry_Date` | EPC expiry date | date |
| 7-8 | `KPI_7_8_EPC_Type` | EPC type | enum ⁴ |
| 8-1 | `KPI_8_1_EnergyCarriersForHeating` | Heating energy carriers | array |
| 9-1 | `KPI_9_1_DirectEmissions` | Direct GHG emissions | array (t CO₂e) |
| 9-2 | `KPI_9_2_IndirectEmissions` | Indirect GHG emissions | array (t CO₂e) |

### Optional KPIs (Extended)

| KPI | Key | What it is | Unit |
|-----|-----|------------|------|
| 2-1 | `KPI_2_1_YearOfLastRetrofit` | Year(s) of last renovation | array |
| 2-2 | `KPI_2_2_TypeOfLastRetrofit` | Type(s) of last renovation | array |
| 8-2 | `KPI_8_2_MeteredEnergyConsumption` | Metered energy consumption | array (kWh/m²a) |
| 8-3 | `KPI_8_3_MeteredEnergyConsumptionAsTable` | Energy consumption table | array |
| 9-3 | `KPI_9_3_OtherIndirectEmissions` | Other indirect GHG emissions | array (t CO₂e) |
| 9-4 | `KPI_9_4_ShareOfEstimatedEmissions` | Share of estimated emissions | % |
| 9-5 | `KPI_9_5_AreIndirectEmissionsBasedOnMarketOrOnLocation` | Market or location based | enum ⁵ |
| 9-6 | `KPI_9_6_CO2EmissionsFactorPerCarrier` | Emission factor per carrier | array (kg CO₂e/kWh) |

### Enum Values

¹ **KPI 3-1:** `Wohnen` · `Handel` · `Büro` · `Hotel` · `Beherbergung und Gastronomie` · `Gesundheit und Soziales` · `Industrie und Logistik` · `Infrastruktur (Energie/Wasser, Kommunikation, Verkehr)` · `Freizeit` · `Kultur und Bildung` · `Mixed-Use` · `Andere`

² **KPI 6-1:** `YES_CA` · `YES_CE` · `YES_CM` · `NO`

³ **KPI 7-2 value:** `A+` · `A` · `B` · `C` · `D` · `E` · `F` · `G` · `Unbekannt` — **source:** `Energieausweis` · `FraunhoferMethode` · `BVI` · `andere`

⁴ **KPI 7-8:** `CONSUMPTION_BASED` · `DEMAND_BASED` · `NO_OBLIGATION` · `NON_EXISTENT`

⁵ **KPI 9-5:** `MARKET_BASED` · `LOCATION_BASED`

---

<sub>Schema version: V0.9.0 · Last updated: May 2026</sub>
