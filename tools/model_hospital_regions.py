#!/usr/bin/env python3
"""Select a planning partition for nonprofit regional hospital administration.

Inputs:
  docs/data/counties.json

The model aggregates county population, rural population, and coordinates to
states, then scores seven transparent candidate partitions containing 10
through 16 regions. The 13-region candidate is an expert-seeded planning
partition; lower-count candidates merge adjacent regions and higher-count
candidates split the largest multi-state regions. A deterministic local search
then moves boundary states when the move improves the objective without
breaking contiguity, minimum scale, or compactness. States remain whole.
Alaska-Washington and Hawaii-California are explicit administrative links, not
claims of land contiguity.

The objective balances:
  * population scale (45%)
  * geographic compactness (25%)
  * rural workload dispersion (15%)
  * administrative overhead / excessive fragmentation (15%)

The program prints the chosen model result as JSON. It is a reproducible
planning model, not a legally binding regionalization or a patient-level travel
time study.
"""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COUNTIES = ROOT / "docs" / "data" / "counties.json"

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

ADJACENCY = {
    "AL": "FL GA MS TN", "AK": "WA", "AZ": "CA CO NV NM UT",
    "AR": "LA MS MO OK TN TX", "CA": "AZ HI NV OR", "CO": "AZ KS NE NM OK UT WY",
    "CT": "MA NY RI", "DE": "MD NJ PA", "DC": "MD VA", "FL": "AL GA",
    "GA": "AL FL NC SC TN", "HI": "CA", "ID": "MT NV OR UT WA WY",
    "IL": "IN IA KY MO WI", "IN": "IL KY MI OH", "IA": "IL MN MO NE SD WI",
    "KS": "CO MO NE OK", "KY": "IL IN MO OH TN VA WV", "LA": "AR MS TX",
    "ME": "NH", "MD": "DE DC PA VA WV", "MA": "CT NH NY RI VT",
    "MI": "IN OH WI", "MN": "IA ND SD WI", "MS": "AL AR LA TN",
    "MO": "AR IL IA KS KY NE OK TN", "MT": "ID ND SD WY",
    "NE": "CO IA KS MO SD WY", "NV": "AZ CA ID OR UT", "NH": "ME MA VT",
    "NJ": "DE NY PA", "NM": "AZ CO OK TX", "NY": "CT MA NJ PA VT",
    "NC": "GA SC TN VA", "ND": "MN MT SD", "OH": "IN KY MI PA WV",
    "OK": "AR CO KS MO NM TX", "OR": "CA ID NV WA", "PA": "DE MD NJ NY OH WV",
    "RI": "CT MA", "SC": "GA NC", "SD": "IA MN MT ND NE WY",
    "TN": "AL AR GA KY MS MO NC VA", "TX": "AR LA NM OK",
    "UT": "AZ CO ID NV WY", "VT": "MA NH NY", "VA": "DC KY MD NC TN WV",
    "WA": "AK ID OR", "WV": "KY MD OH PA VA", "WI": "IL IA MI MN",
    "WY": "CO ID MT NE SD UT",
}
ADJACENCY = {state: set(neighbors.split()) for state, neighbors in ADJACENCY.items()}

BASE_REGIONS = [
    {"AK", "WA", "OR", "ID", "MT", "WY"},
    {"CA", "HI"},
    {"NV", "UT", "AZ", "NM", "CO"},
    {"TX"},
    {"ND", "SD", "NE", "KS", "OK", "MO", "AR"},
    {"MN", "IA", "WI", "IL"},
    {"MI", "IN", "OH"},
    {"LA", "MS", "AL", "TN", "KY"},
    {"FL"},
    {"GA", "SC", "NC"},
    {"VA", "WV", "MD", "DE", "DC", "PA"},
    {"NY", "NJ"},
    {"CT", "RI", "MA", "VT", "NH", "ME"},
]


def great_circle_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def load_states() -> dict[str, dict[str, float]]:
    counties = json.loads(COUNTIES.read_text(encoding="utf-8"))
    states: dict[str, dict[str, float]] = {}
    for county in counties:
        state = county["s"]
        row = states.setdefault(
            state, {"population": 0.0, "rural_population": 0.0, "lat_sum": 0.0, "lon_sum": 0.0}
        )
        population = float(county["p"])
        row["population"] += population
        row["rural_population"] += population * float(county["r"])
        row["lat_sum"] += population * float(county["la"])
        row["lon_sum"] += population * float(county["lo"])
    for state, row in states.items():
        row["lat"] = row.pop("lat_sum") / row["population"]
        row["lon"] = row.pop("lon_sum") / row["population"]
        row["rural_share"] = row["rural_population"] / row["population"]
        row["name"] = STATE_NAMES[state]
    return states


def summarize_region(members: set[str], states: dict[str, dict[str, float]]) -> dict[str, float]:
    population = sum(states[state]["population"] for state in members)
    rural_population = sum(states[state]["rural_population"] for state in members)
    lat = sum(states[state]["population"] * states[state]["lat"] for state in members) / population
    lon = sum(states[state]["population"] * states[state]["lon"] for state in members) / population
    mean_distance = (
        sum(
            states[state]["population"]
            * great_circle_miles(lat, lon, states[state]["lat"], states[state]["lon"])
            for state in members
        )
        / population
    )
    return {
        "population": population,
        "rural_population": rural_population,
        "rural_share": rural_population / population,
        "lat": lat,
        "lon": lon,
        "mean_distance": mean_distance,
    }


def regions_touch(left: set[str], right: set[str]) -> bool:
    return any(ADJACENCY[state] & right for state in left)


def replace_regions(
    regions: list[set[str]], remove: list[set[str]], add: list[set[str]]
) -> list[set[str]]:
    remove_keys = {frozenset(region) for region in remove}
    kept = [set(region) for region in regions if frozenset(region) not in remove_keys]
    return kept + [set(region) for region in add]


def build_partition(k: int, states: dict[str, dict[str, float]]) -> list[set[str]]:
    """Return one auditable candidate for a requested region count."""
    del states  # Candidate geometry is fixed; state data are used by scoring.
    regions = [set(region) for region in BASE_REGIONS]

    northwest = BASE_REGIONS[0]
    mountain = BASE_REGIONS[2]
    plains = BASE_REGIONS[4]
    upper_midwest = BASE_REGIONS[5]
    gulf = BASE_REGIONS[7]
    chesapeake = BASE_REGIONS[10]
    northeast = BASE_REGIONS[11]
    new_england = BASE_REGIONS[12]

    if k <= 12:
        regions = replace_regions(
            regions,
            [northeast, new_england],
            [northeast | new_england],
        )
    if k <= 11:
        regions = replace_regions(
            regions,
            [plains, upper_midwest],
            [plains | upper_midwest],
        )
    if k <= 10:
        regions = replace_regions(
            regions,
            [northwest, mountain],
            [northwest | mountain],
        )

    if k >= 14:
        regions = replace_regions(
            regions,
            [northwest],
            [{"AK", "WA", "OR"}, {"ID", "MT", "WY"}],
        )
    if k >= 15:
        regions = replace_regions(
            regions,
            [gulf],
            [{"LA", "MS", "AL"}, {"TN", "KY"}],
        )
    if k >= 16:
        regions = replace_regions(
            regions,
            [chesapeake],
            [{"PA", "MD", "DE", "DC"}, {"VA", "WV"}],
        )
    return regions


def validate_partition(regions: list[set[str]], states: dict[str, dict[str, float]]) -> None:
    assigned = [state for region in regions for state in region]
    if len(assigned) != len(set(assigned)):
        raise ValueError("A state or the District of Columbia is assigned more than once")
    if set(assigned) != set(states):
        raise ValueError("Partition does not cover all states and the District of Columbia")
    for region in regions:
        reached = {next(iter(region))}
        while True:
            expanded = reached | {
                candidate
                for state in reached
                for candidate in ADJACENCY[state]
                if candidate in region
            }
            if expanded == reached:
                break
            reached = expanded
        if reached != region:
            raise ValueError(f"Region is not contiguous: {sorted(region)}")


def optimize_partition(
    regions: list[set[str]], states: dict[str, dict[str, float]]
) -> list[set[str]]:
    """Improve a seeded candidate through deterministic contiguous state moves."""
    regions = [set(region) for region in regions]
    minimum_population = 12_000_000
    for _ in range(100):
        current_score = partition_score(regions, states)["total"]
        best = None
        for source_index, source in enumerate(regions):
            if len(source) == 1:
                continue
            for state in sorted(source):
                reduced = source - {state}
                if sum(states[item]["population"] for item in reduced) < minimum_population:
                    continue
                for destination_index, destination in enumerate(regions):
                    if source_index == destination_index:
                        continue
                    if not (ADJACENCY[state] & destination):
                        continue
                    destination_summary = summarize_region(destination, states)
                    if great_circle_miles(
                        states[state]["lat"],
                        states[state]["lon"],
                        destination_summary["lat"],
                        destination_summary["lon"],
                    ) > 425:
                        continue
                    candidate = [set(region) for region in regions]
                    candidate[source_index].remove(state)
                    candidate[destination_index].add(state)
                    if summarize_region(candidate[destination_index], states)["mean_distance"] > 300:
                        continue
                    try:
                        validate_partition(candidate, states)
                    except ValueError:
                        continue
                    score = partition_score(candidate, states)["total"]
                    move = (score, state, source_index, destination_index, candidate)
                    if score < current_score - 1e-10 and (best is None or move[:4] < best[:4]):
                        best = move
        if best is None:
            break
        regions = best[4]
    return regions


def partition_score(regions: list[set[str]], states: dict[str, dict[str, float]]) -> dict[str, float]:
    total_population = sum(row["population"] for row in states.values())
    target = total_population / len(regions)
    national_rural = sum(row["rural_population"] for row in states.values()) / total_population
    summaries = [summarize_region(region, states) for region in regions]

    population = sum(
        (
            (summary["population"] - max(target, max(states[s]["population"] for s in region)))
            / max(target, max(states[s]["population"] for s in region))
        )
        ** 2
        for region, summary in zip(regions, summaries)
    ) / len(regions)
    compactness = sum((summary["mean_distance"] / 700.0) ** 2 for summary in summaries) / len(regions)
    rural = sum(((summary["rural_share"] - national_rural) / 0.20) ** 2 for summary in summaries) / len(regions)
    fragmentation = ((len(regions) - 13) / 5.0) ** 2
    total = 0.45 * population + 0.25 * compactness + 0.15 * rural + 0.15 * fragmentation
    return {
        "total": total,
        "population_balance": population,
        "compactness": compactness,
        "rural_balance": rural,
        "fragmentation": fragmentation,
    }


def region_name(members: set[str]) -> str:
    names = {
        frozenset({"AK", "WA", "OR", "ID", "MT", "WY"}): "Northwest and Alaska",
        frozenset({"CA", "HI"}): "California and Hawaii",
        frozenset({"NV", "UT", "AZ", "NM", "CO"}): "Mountain Southwest",
        frozenset({"TX"}): "Texas",
        frozenset({"ND", "SD", "NE", "KS", "OK", "MO", "AR"}): "Central Plains",
        frozenset({"MN", "IA", "WI", "IL"}): "Upper Midwest",
        frozenset({"MI", "IN", "OH"}): "Great Lakes",
        frozenset({"LA", "MS", "AL", "TN", "KY"}): "Gulf and Mid-South",
        frozenset({"FL"}): "Florida",
        frozenset({"GA", "SC", "NC"}): "South Atlantic",
        frozenset({"VA", "WV", "MD", "DE", "DC", "PA"}): "Chesapeake and Appalachia",
        frozenset({"NY", "NJ"}): "Northeast Metro",
        frozenset({"CT", "RI", "MA", "VT", "NH", "ME"}): "New England",
        frozenset({"LA", "TX"}): "Texas and Louisiana",
        frozenset({"AR", "IA", "KS", "MO", "ND", "NE", "OK", "SD"}): "Central Plains",
        frozenset({"IL", "MN", "WI"}): "Upper Midwest",
        frozenset({"AL", "IN", "KY", "MS", "TN"}): "Ohio Valley and Mid-South",
        frozenset({"MI", "OH", "WV"}): "Great Lakes and Appalachia",
        frozenset({"DC", "MD", "PA", "VA"}): "Chesapeake",
        frozenset({"DE", "NJ", "NY"}): "Northeast Metro",
    }
    return names.get(frozenset(members), " / ".join(sorted(members)))


def main() -> None:
    states = load_states()
    tested = []
    partitions = {}
    for k in range(10, 17):
        partition = optimize_partition(build_partition(k, states), states)
        validate_partition(partition, states)
        partitions[k] = partition
        tested.append({"regions": k, **partition_score(partition, states)})

    best = min(tested, key=lambda row: (row["total"], row["regions"]))
    k = int(best["regions"])
    chosen = partitions[k]
    output_regions = []
    for index, members in enumerate(
        sorted(chosen, key=lambda region: summarize_region(region, states)["lon"])
    ):
        summary = summarize_region(members, states)
        output_regions.append(
            {
                "id": f"R{index + 1:02d}",
                "name": region_name(members),
                "states": sorted(members),
                "population": round(summary["population"]),
                "rural_population": round(summary["rural_population"]),
                "rural_share": round(summary["rural_share"], 4),
                "centroid": [round(summary["lon"], 3), round(summary["lat"], 3)],
                "mean_state_centroid_miles": round(summary["mean_distance"]),
            }
        )

    result = {
        "model": {
            "version": "1.1",
            "run_date": "2026-07-19",
            "selected_region_count": k,
            "tested_region_counts": tested,
            "candidate_method": (
                "Expert-seeded candidates with adjacent-region merges for "
                "10-12 and contiguous multi-state splits for 14-16, followed "
                "by deterministic boundary-state moves that lower the objective"
            ),
            "weights": {
                "population_scale": 0.45,
                "geographic_compactness": 0.25,
                "rural_workload": 0.15,
                "administrative_fragmentation": 0.15,
            },
            "hard_constraints": [
                "All 50 states and the District of Columbia assigned exactly once",
                "State boundaries preserved",
                "Regions contiguous through state borders, except explicit AK-WA and HI-CA administrative links",
                "A boundary move cannot leave a region below 12 million people",
                "A moved state must be within 425 miles of the destination region centroid",
                "A boundary move cannot raise destination mean state-centroid distance above 300 miles",
            ],
            "source": "Census 2024 county population estimates and 2020 rural shares in docs/data/counties.json",
        },
        "regions": output_regions,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
