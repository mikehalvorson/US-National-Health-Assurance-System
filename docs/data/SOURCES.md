# Data Sources

All files retrieved 2026-07-16. Both JSON files are UTF-8 without BOM and parse with plain `JSON.parse`.

## counties.json

One object per U.S. county-equivalent (50 states + DC; Puerto Rico and territories excluded). **3,144 rows**, population sum **340,110,988** (2024 estimates). Fields: `f` = 5-digit FIPS, `n` = name without County/Parish/Borough/Census Area/Municipality/Planning Region suffix, `s` = state USPS abbreviation, `p` = 2024 population estimate, `r` = 2020 rural population share (0–1, 2 decimals), `la`/`lo` = internal-point latitude/longitude (2 decimals).

| Field | Source |
|---|---|
| `p`, `n` | Census Bureau county population estimates, vintage 2024: <https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv> (SUMLEV 050 rows, POPESTIMATE2024) |
| `la`, `lo`, `s` | Census 2024 Gazetteer, counties national file: <https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_counties_national.zip> (GEOID, USPS, INTPTLAT, INTPTLONG) |
| `r` | Census 2020 urban–rural county file: <https://www2.census.gov/geo/docs/reference/ua/2020_UA_COUNTY.xlsx> — `r = POP_RUR / POP_COU` from the `2020_UA_COUNTY` sheet; Connecticut planning-region values from the `CT_2022` sheet of the same workbook |

**Rural-share fallback note:** the plan of record was the 2020 DHC API (table P2), but `api.census.gov` now refuses keyless requests ("A valid key must be included with each data API request"), so the published 2020 urban–rural county workbook above was used instead. It contains the same 2020 Census urban/rural population counts.

**Connecticut reconciliation:** the vintage-2024 population file uses CT's 9 planning regions (FIPS 09110–09190), not the 8 legacy counties. The file follows the population geography: coordinates come from the 2024 Gazetteer (which includes planning regions) and rural shares from the workbook's `CT_2022` planning-region sheet. Legacy CT county FIPS (09001–09015) do not appear.

**Dropped rows: 0.** All 3,144 population rows (3,135 counties outside CT + 9 CT planning regions) matched both the gazetteer and the urban–rural file on 5-digit FIPS.

Caveats:
- `r` reflects the 2020 Census urban-area delineation applied to 2020 population; `p` is a 2024 estimate, so the two have different reference dates.
- Virginia independent cities keep their lowercase " city" suffix (e.g. "Richmond city") to distinguish them from same-named counties.
- Alaska geographies reflect post-2019 definitions (Chugach 02063, Copper River 02066; no Valdez–Cordova).

## us-states.json

GeoJSON FeatureCollection of state outlines, **51 features** (50 states + District of Columbia), **88,743 bytes**, WGS84 `[longitude, latitude]` (spot check: California's western edge reaches −124.41).

- Source: <https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json> (simplified geometry derived from Census cartographic boundaries; public domain source data).
- One modification: the Puerto Rico feature (id 72) was removed, since the dashboard's county data excludes Puerto Rico. Geometry was otherwise saved as-is (no reprojection or re-simplification).
- Feature properties include `name` (state name) and a legacy `density` attribute from the source file (ignore it).

## hospital-regions.json

Model output for the Physical Care tab's 13 proposed nonprofit hospital
administration regions. The file assigns all 50 states and the District of
Columbia exactly once and stores each region's population, rural population,
rural share, population-weighted centroid, and population-weighted mean
distance between member-state centroids.

- Inputs: `counties.json` and its Census sources above.
- Model: `tools/model_hospital_regions.py`.
- Methodology, candidate scores, limitations, and exact assignments:
  `research/hospital_regionalization_methodology.md`.
- Run date: 2026-07-19.

The model compares transparent candidates containing 10 through 16 regions.
The 13-region candidate is expert-seeded; lower-count candidates merge
adjacent regions and higher-count candidates split multi-state regions. A
deterministic local search then accepts objective-improving boundary-state
moves subject to contiguity, minimum-scale, and compactness limits. It is a
planning model, not an exhaustive optimization over every possible state
partition and not a legally binding boundary map.
