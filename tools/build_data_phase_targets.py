"""Build the Data-tab rollout scorecards and their derivation documentation.

The scorecards use controlled KPP/TPP names and maturity targets from the
generated quality catalog.  Interim values are explicit policy-management
proposals, not silently substituted framework requirements.
"""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUALITY_DATA = ROOT / "docs" / "js" / "qualitydata.js"
JS_OUTPUT = ROOT / "docs" / "js" / "dataphases.js"
DOC_OUTPUT = ROOT / "research" / "data_phase_target_methodology.md"


PHASES = [
    {
        "id": "P0",
        "year": 1,
        "title": "Data law, contracts, and test controls",
        "summary": "Define who may create, read, correct, audit, and publish each data object before live reliance begins.",
        "work": [
            "Register priority formulas, definitions, owners, and evidence contracts",
            "Prototype rights notices, record correction, audit, and public reporting",
            "Exercise tabletop cyber, downtime, and reconciliation procedures",
        ],
        "groups": [
            {
                "section": "Governance and public assurance",
                "why": "The system needs reproducible definitions and visible reporting before operating data is trusted.",
                "metrics": [
                    ("TPP-FORM1", "≥70% of priority formulas registered", "derived", "A 70% foundation threshold forces the formulas needed for identity, payment, records, cyber, and phase evidence into version control while leaving noncritical formulas for later validation."),
                    ("TPP-12.4", "≥90% of required foundation reports on time", "derived", "A small foundation reporting set should already be highly reliable; 90% exposes process failures without pretending the mature 99% publication service exists."),
                ],
            },
            {
                "section": "Rights and correction",
                "why": "People must be able to understand and correct the system before their care depends on it.",
                "metrics": [
                    ("TPP-USE1", "≥75% comprehension in representative prototype tests", "derived", "Seventy-five percent is a go/no-go usability floor that leaves a visible 15-point improvement obligation to the mature 90% target."),
                    ("TPP-10.5", "≥80% of prototype correction cases closed in the draft timeframe", "derived", "The first correction workflow is deliberately tested with difficult cases; 80% is high enough to reveal whether ownership and escalation work before live reliance."),
                ],
            },
            {
                "section": "Cyber and continuity",
                "why": "The first evidence is exercised procedure, not production uptime.",
                "metrics": [
                    ("TPP-11.2", "≥85% of tabletop and downtime exercises passed", "derived", "Passing at least 85% of the representative exercise set establishes a credible baseline while preserving a substantial repair path to the mature 98% drill target."),
                ],
            },
        ],
    },
    {
        "id": "P1",
        "year": 2,
        "title": "Identity, registries, rights, and cyber foundation",
        "summary": "Demonstrate the authoritative identity and registry layer and the controls needed to rely on it safely.",
        "work": [
            "Verify person, provider, and facility identity against authoritative sources",
            "Certify reference exchange endpoints and correction workflows",
            "Run production-like availability and downtime drills before first operation",
        ],
        "groups": [
            {
                "section": "Identity and registries",
                "why": "Enrollment, payment, records, and audit all fail if the person or provider is wrong.",
                "metrics": [
                    ("TPP-1.1", "≥99.0% match accuracy in the controlled identity cohort", "derived", "A 99.0% pilot floor sharply limits duplicate or merged identity defects while leaving the last 0.8 percentage points for broader edge cases and maturity."),
                    ("TPP-10.1", "≥95% of active pilot provider/facility records verified", "derived", "Ninety-five percent supports representative pilots and makes the remaining verification backlog explicit before transactional use."),
                ],
            },
            {
                "section": "Exchange, rights, and correction",
                "why": "A shared identifier is useful only if endpoints conform and people can repair mistakes.",
                "metrics": [
                    ("TPP-10.6", "≥90% conformance across reference endpoints", "derived", "The reference suite should certify nine of ten cases before live traffic; later phases add vendor diversity and adverse conditions."),
                    ("TPP-10.5", "≥90% correction closure within the statutory timeframe", "derived", "Moving from the P0 prototype floor to 90% verifies staffing, notice, escalation, and closure in the authoritative registry environment."),
                ],
            },
            {
                "section": "Cyber and continuity",
                "why": "Registry reliance requires measurable availability and tested degraded operation.",
                "metrics": [
                    ("TPP-11.1", "≥99.90% production-like uptime", "derived", "This permits about 8 hours 46 minutes of annualized downtime in the foundation environment, then tightens as care reliance expands."),
                    ("TPP-11.2", "≥90% of downtime exercises passed", "derived", "Nine of ten successful exercises is the next step from tabletop readiness and precedes pharmacy and coverage reliance."),
                ],
            },
        ],
    },
    {
        "id": "P2",
        "year": 3,
        "title": "Pharmacy data first operation",
        "summary": "Use the pharmacy rail as the first national, high-volume test of identity, medication continuity, payment, and recovery.",
        "work": [
            "Adjudicate pharmacy transactions against identity, eligibility, and formulary data",
            "Build the longitudinal medication view for participating people",
            "Prove recovery, vulnerability remediation, and safe medication bridges",
        ],
        "groups": [
            {
                "section": "Medication and pharmacy exchange",
                "why": "The first operational data rail must protect medication access while creating a reliable medication record.",
                "metrics": [
                    ("TPP-3.1", "≥97% real-time pharmacy adjudication", "derived", "A national first-operation rail should handle nearly all routine transactions in real time, with explicit fallback for the remaining cases before the mature 99.5% target."),
                    ("TPP-10.2", "≥85% medication-record completeness for participating people", "derived", "The first longitudinal medication view is limited to participating coverage; 85% makes source onboarding gaps visible without claiming national completeness."),
                    ("KPP-T2", "≤1.0% critical-medication interruption", "derived", "A one-percent ceiling is five times the mature ceiling but low enough that continuity failures cannot be dismissed as startup noise."),
                ],
            },
            {
                "section": "Exchange conformance",
                "why": "Pharmacies, prescribers, purchasing, and claims need a consistent contract.",
                "metrics": [
                    ("TPP-10.6", "≥94% conformance across pharmacy and medication endpoints", "derived", "The P1 reference suite tightens by four points when real vendors and transaction recovery are added."),
                ],
            },
            {
                "section": "Cyber and continuity",
                "why": "Medication access cannot depend on an untested always-online assumption.",
                "metrics": [
                    ("TPP-11.1", "≥99.93% critical-rail uptime", "derived", "This limits annualized downtime to about 6 hours 8 minutes while retaining bounded emergency-fill and offline paths."),
                    ("TPP-11.3", "≥95% of critical vulnerabilities remediated within 15 days", "derived", "The first live rail should close nineteen of twenty critical findings on time; repeated misses block wider coverage reliance."),
                ],
            },
        ],
    },
    {
        "id": "P3",
        "year": 4,
        "title": "Coverage Wave I data operation",
        "summary": "Connect identity, eligibility, claims, records, appeals, and transfer evidence for the first covered populations.",
        "work": [
            "Run identity and eligibility at Wave I scale with protected manual fallback",
            "Measure claims readiness, record transfer, and medication continuity together",
            "Publish appeal, correction, and availability evidence before wider conversion",
        ],
        "groups": [
            {
                "section": "Identity and eligibility",
                "why": "Wave I coverage is only real if the right person is continuously recognized and confirmed.",
                "metrics": [
                    ("TPP-1.1", "≥99.5% match accuracy in Wave I", "derived", "Wave I closes most of the remaining identity gap before national default coverage while preserving independent review of rare edge cases."),
                    ("TPP-1.2", "≥95% real-time eligibility confirmation", "derived", "Ninety-five percent supports routine point-of-service use while the remaining cases retain provisional and manual confirmation."),
                ],
            },
            {
                "section": "Claims and transfer",
                "why": "Claims performance and patient-level continuity are co-equal expansion evidence.",
                "metrics": [
                    ("TPP-2.1", "≥75% clean-claim auto-adjudication for Wave I", "framework", "This is the framework's explicit Gate 1 floor for moving from P3 to P4."),
                    ("KPP-T1", "≥97% active-treatment transfer success", "derived", "A three-percent repair corridor is appropriate for the first controlled migration, but every failed transfer remains an owned continuity case on the path to 99%."),
                    ("TPP-10.2", "≥90% medication-record completeness in Wave I", "derived", "The participating medication view tightens five points because coverage conversion expands the sources and the consequences of missing data."),
                ],
            },
            {
                "section": "Rights and continuity",
                "why": "A data error must have a usable remedy and the operating rail must remain available.",
                "metrics": [
                    ("TPP-12.6", "≥90% of appeals resolved within urgency class", "derived", "Nine of ten timely decisions is a minimum usable Wave I remedy; unresolved delay patterns must be repaired before larger conversion."),
                    ("TPP-11.1", "≥99.94% critical-system uptime", "derived", "This limits annualized downtime to about 5 hours 15 minutes as coverage and claims become operationally dependent on the rail."),
                ],
            },
        ],
    },
    {
        "id": "P4",
        "year": 6,
        "title": "Clinical, hospital, and unit data pilots",
        "summary": "Test whether the shared record closes real diagnostic, discharge, referral, and downtime loops in representative delivery settings.",
        "work": [
            "Connect laboratories, hospitals, diagnostic-treatment units, and specialty pilots",
            "Measure complete diagnostic encounters, referral packets, and discharge handoffs",
            "Use claims and downtime evidence to decide whether delivery pilots may scale",
        ],
        "groups": [
            {
                "section": "Clinical records and exchange",
                "why": "The pilot must prove that high-value clinical events arrive in usable form and on time.",
                "metrics": [
                    ("TPP-10.3", "≥90% of pilot lab results interoperable within target", "derived", "Ninety percent is a demanding representative-pilot threshold that still exposes vendor, vocabulary, and routing defects before scale."),
                    ("TPP-10.4", "≥90% of pilot discharge summaries structured within 24 hours", "derived", "A matched 90% threshold tests hospital workflow and receiving-provider availability without claiming mature national performance."),
                ],
            },
            {
                "section": "Provider workflow and closure",
                "why": "Transmission alone is not success; the encounter and referral must be complete enough to act on.",
                "metrics": [
                    ("TPP-6.2", "≥90% diagnostic completeness in pilot unit encounters", "derived", "The pilot should complete nine of ten applicable diagnostic records, with missing elements independently reviewed for safety."),
                    ("TPP-7.1", "≥90% referral-packet completeness", "derived", "Using the same pilot floor aligns unit and specialist handoffs and reveals which fields or workflows fail together."),
                ],
            },
            {
                "section": "Payment and continuity",
                "why": "Delivery pilots should not scale on unstable payment or untested downtime behavior.",
                "metrics": [
                    ("TPP-2.1", "≥75% clean-claim auto-adjudication for Wave I", "framework", "The framework requires the Gate 1 floor before P4; the pilot keeps it visible as an entry condition rather than relabeling it mature performance."),
                    ("TPP-11.2", "≥94% of delivery-setting downtime exercises passed", "derived", "Adding hospital, laboratory, unit, and referral scenarios raises the P2 readiness expectation while retaining time to repair cross-setting failures."),
                ],
            },
        ],
    },
    {
        "id": "P5",
        "year": 7,
        "title": "Clinical data and routing scale",
        "summary": "Scale the unit and specialty information loops while measuring completeness, follow-up, and unsafe non-escalation.",
        "work": [
            "Expand the diagnostic-treatment network to the framework's 65% population milestone",
            "Tighten diagnostic, abnormal-result, referral, lab, and discharge data quality",
            "Use clinical-record review to drive unsafe under-referral toward the Gate 2 floor",
        ],
        "groups": [
            {
                "section": "Network reach and safety",
                "why": "The data layer must scale with physical access and reveal unsafe routing before national cost-sharing changes.",
                "metrics": [
                    ("KPP-B7", "≥65% population within the unit-network coverage milestone", "framework", "This is the framework's explicit P5 phase-end milestone."),
                    ("KPP-B9", "≤8 unsafe under-referrals per 10,000 non-escalated encounters", "derived", "An eight-per-10,000 scale threshold creates a monotone safety path to the Gate 2 ceiling of five and mature ceiling of three."),
                ],
            },
            {
                "section": "Provider workflow and closure",
                "why": "Scaled care requires better-than-pilot completeness and explicit ownership of abnormal results.",
                "metrics": [
                    ("TPP-6.2", "≥94% diagnostic completeness", "derived", "A four-point increase from the pilot floor is a practical scale target on the path to 98% maturity."),
                    ("TPP-6.3", "≥95% abnormal-result follow-up closure", "derived", "At scale, no more than one in twenty eligible abnormal results should lack timely closure; the maturity obligation remains 99%."),
                    ("TPP-7.1", "≥94% referral-packet completeness", "derived", "The referral packet follows the same pilot-to-scale tightening as diagnostic completeness so specialist queues are not fed incomplete cases."),
                ],
            },
            {
                "section": "Clinical exchange",
                "why": "Laboratory and discharge data must keep pace with network expansion.",
                "metrics": [
                    ("TPP-10.3", "≥94% lab-result interoperability within target", "derived", "The lab exchange target rises four points from the representative-pilot floor before national reliance."),
                    ("TPP-10.4", "≥94% structured discharge summaries within 24 hours", "derived", "Matching the lab ramp keeps the two highest-value cross-setting handoffs on a common scale path."),
                ],
            },
        ],
    },
    {
        "id": "P6",
        "year": 8,
        "title": "National data reliance",
        "summary": "Make the public information rail nationally dependable before broad cost-sharing elimination and full legacy-payer sunset.",
        "work": [
            "Meet the framework's unit-capacity and under-referral Gate 2 floors",
            "Bring national registries, medication, lab, discharge, and API performance near maturity",
            "Keep national identity, coverage, cyber, and manual fallback evidence visible together",
        ],
        "groups": [
            {
                "section": "Coverage, reach, and routing safety",
                "why": "National default coverage cannot outrun identity or staffed access capacity.",
                "metrics": [
                    ("KPP-A1", "≥99.0% continuous coverage", "derived", "National default coverage should be within 0.5 percentage points of the mature 99.5% outcome while residual continuity defects remain actively repaired."),
                    ("KPP-B7", "≥80% population within the unit access standard", "framework", "This is the framework's explicit Gate 2 floor before broad cost-sharing elimination."),
                    ("KPP-B9", "≤5 unsafe under-referrals per 10,000 non-escalated encounters", "framework", "This is the framework's explicit Gate 2 safety ceiling."),
                ],
            },
            {
                "section": "National records and exchange",
                "why": "Core data domains should be close enough to maturity that national gaps are bounded and repairable.",
                "metrics": [
                    ("TPP-10.1", "≥99.0% active provider/facility records verified", "derived", "A national registry may carry no more than a one-percent verification gap before the last half-point is closed for maturity."),
                    ("TPP-10.2", "≥93% medication-record completeness", "derived", "The medication record tightens to within two points of maturity as coverage becomes the national default."),
                    ("TPP-10.3", "≥96% lab-result interoperability within target", "derived", "National exchange moves halfway from the P5 scale value of 94% to the mature 98% target."),
                    ("TPP-10.4", "≥96% structured discharge summaries within 24 hours", "derived", "The discharge path uses the same national ramp as laboratory exchange to support cross-setting continuity."),
                    ("TPP-10.6", "≥97% API conformance", "derived", "Only three in one hundred endpoints may fail the national conformance suite before the final point is closed at maturity."),
                ],
            },
            {
                "section": "Cyber and continuity",
                "why": "National reliance requires a tighter availability budget and retained manual paths.",
                "metrics": [
                    ("TPP-11.1", "≥99.95% critical-system uptime", "derived", "This limits annualized downtime to about 4 hours 23 minutes while the mature architecture, drills, and vendor escape controls continue to improve."),
                ],
            },
        ],
    },
    {
        "id": "P7",
        "year": 10,
        "title": "Expanded-benefit data integration",
        "summary": "Extend the national record and rights model to long-term care, behavioral health, dental, vision, hearing, EMS, and public health.",
        "work": [
            "Meet the framework's assessment-timeliness floor before full expansion",
            "Integrate new benefit records without weakening correction or segmentation rights",
            "Tighten exchange, uptime, and public reporting to the final pre-maturity band",
        ],
        "groups": [
            {
                "section": "Expanded-benefit readiness",
                "why": "The expansion depends on timely assessment data and a usable longitudinal view across new settings.",
                "metrics": [
                    ("TPP-9.1", "≥85% LTC functional assessments completed on time", "framework", "This is the framework's explicit Gate 3 floor before full expanded-benefit rollout."),
                    ("TPP-10.2", "≥94% medication-record completeness", "derived", "Expanded benefits add new prescribers and settings; the target tightens to within one point of maturity while measuring the added integration load."),
                ],
            },
            {
                "section": "Records, exchange, and correction",
                "why": "New settings must join the same lab, discharge, and correction contracts rather than create another silo.",
                "metrics": [
                    ("TPP-10.3", "≥97% lab-result interoperability within target", "derived", "The final pre-maturity band closes one of the remaining two national percentage points."),
                    ("TPP-10.4", "≥97% structured discharge summaries within 24 hours", "derived", "Discharge exchange follows the same one-point pre-maturity step as lab results."),
                    ("TPP-10.5", "≥95% correction closure within the statutory timeframe", "derived", "The expanded setting mix should be within two points of the mature correction target before certification."),
                ],
            },
            {
                "section": "Continuity and transparency",
                "why": "The broader benefit set needs near-mature uptime and public evidence.",
                "metrics": [
                    ("TPP-11.1", "≥99.96% critical-system uptime", "derived", "This limits annualized downtime to about 3 hours 30 minutes before the final maturity step to 99.97%."),
                    ("TPP-12.4", "≥98% of required public data published on time", "derived", "The final pre-maturity reporting target leaves only one percentage point to close while keeping expansion performance publicly reviewable."),
                ],
            },
        ],
    },
    {
        "id": "P8",
        "year": 12,
        "title": "Mature information-mesh certification",
        "summary": "Assess the complete mesh against the controlled maturity targets and keep unresolved defects in a public repair plan.",
        "work": [
            "Certify identity, registry, medication, lab, discharge, correction, and API performance",
            "Certify critical availability, downtime continuity, and vulnerability remediation",
            "Verify that national coverage outcomes are supported by reproducible data",
        ],
        "groups": [
            {
                "section": "Identity and coverage outcome",
                "why": "Maturity requires both a highly accurate identity layer and the coverage outcome it supports.",
                "metrics": [
                    ("TPP-1.1", "≥99.8% match accuracy", "framework", "Controlled maturity target from the complete TPP dictionary."),
                    ("KPP-A1", "≥99.5% continuous coverage", "framework", "Controlled maturity target from the complete KPP dictionary."),
                ],
            },
            {
                "section": "Mature records and exchange",
                "why": "The core information-mesh measures are assessed at their controlled source targets.",
                "metrics": [
                    ("TPP-10.1", "≥99.5% active records verified", "framework", "Controlled maturity target from the complete TPP dictionary."),
                    ("TPP-10.2", "≥95% medication-record completeness", "framework", "Controlled maturity target from the complete TPP dictionary."),
                    ("TPP-10.3", "≥98% lab-result interoperability within target", "framework", "Controlled maturity target from the complete TPP dictionary."),
                    ("TPP-10.4", "≥98% structured discharge summaries within 24 hours", "framework", "Controlled maturity target from the complete TPP dictionary."),
                    ("TPP-10.5", "≥97% correction closure within the statutory timeframe", "framework", "Controlled maturity target from the complete TPP dictionary."),
                    ("TPP-10.6", "≥98% API conformance", "framework", "Controlled maturity target from the complete TPP dictionary."),
                ],
            },
            {
                "section": "Mature cyber and continuity",
                "why": "Availability, degraded operation, and remediation are certified together.",
                "metrics": [
                    ("TPP-11.1", "≥99.97% critical-system uptime", "framework", "Controlled maturity target from the complete TPP dictionary."),
                    ("TPP-11.2", "≥98% of downtime-continuity drills passed", "framework", "Controlled maturity target from the complete TPP dictionary."),
                    ("TPP-11.3", "≥99% of critical vulnerabilities remediated within 15 days", "framework", "Controlled maturity target from the complete TPP dictionary."),
                ],
            },
        ],
    },
]


def load_quality_parameters() -> dict[str, dict]:
    raw = QUALITY_DATA.read_text(encoding="utf-8")
    prefix = "window.NHA_QUALITY_DATA="
    if not raw.startswith(prefix):
        raise ValueError("Unrecognized qualitydata.js wrapper")
    catalog = json.loads(raw[len(prefix) :].rstrip(";\n"))
    return {item["id"]: item for item in catalog["parameters"]}


def build_payload() -> dict:
    parameters = load_quality_parameters()
    used: set[str] = set()
    phases = []
    for phase in PHASES:
        built = {key: value for key, value in phase.items() if key != "groups"}
        built["groups"] = []
        for group in phase["groups"]:
            built_group = {"section": group["section"], "why": group["why"], "metrics": []}
            for identifier, target, basis, justification in group["metrics"]:
                parameter = parameters.get(identifier)
                if not parameter or parameter["type"] not in {"KPP", "TPP"}:
                    raise ValueError(f"Unknown KPP/TPP: {identifier}")
                if basis not in {"framework", "derived"}:
                    raise ValueError(f"Unknown target basis: {basis}")
                used.add(identifier)
                built_group["metrics"].append(
                    {
                        "id": identifier,
                        "name": parameter["name"],
                        "phaseTarget": target,
                        "matureTarget": parameter["target"],
                        "basis": basis,
                        "justification": justification,
                    }
                )
            built["groups"].append(built_group)
        phases.append(built)
    return {
        "source": "National Health Assurance Framework v2.0.0 FINAL",
        "methodologyPath": "research/data_phase_target_methodology.md",
        "phases": phases,
        "metricCount": len(used),
        "targetCount": sum(
            len(group["metrics"])
            for phase in phases
            for group in phase["groups"]
        ),
    }


def markdown(payload: dict) -> str:
    lines = [
        "# Data-system phase targets: derivation and justification",
        "",
        "> Generated by `tools/build_data_phase_targets.py` from the controlled KPP/TPP catalog and the explicit interim proposals maintained in that script.",
        "",
        "## Status and scope",
        "",
        "The National Health Assurance Framework defines mature KPP/TPP targets and a small number of explicit rollout milestones or gate floors. It does **not** define a numeric target for every metric in every phase. The Data dashboard therefore uses two visibly different target classes:",
        "",
        "- **Framework** — copied from a controlled source target, phase milestone, or gate floor.",
        "- **Derived** — a proposed interim management threshold created for the dashboard. It is not a new framework requirement and must not be presented as one.",
        "",
        "Early-phase derived targets apply to the controlled test, pilot, participating-provider, or Wave I denominator stated in the target. They do not imply national performance before national deployment.",
        "",
        "## Derivation rules",
        "",
        "1. **Anchor before interpolation.** Exact phase milestones and gate floors override any derived path. P3/P4 claims, P5/P6 unit coverage, P6 under-referral, and P7 LTC assessment use the framework values.",
        "2. **Back-cast monotonically from maturity.** Derived adoption and completeness rates rise toward the mature target; adverse-event rates fall toward it. A later phase is never made easier without an explicit scope change.",
        "3. **Tighten before dependency expands.** Identity, medication continuity, abnormal-result closure, uptime, and vulnerability targets receive stricter early floors because a defect can directly interrupt care.",
        "4. **Use bounded denominators.** P0-P2 values apply to test or participating cohorts; P3 to Wave I; P4 to representative pilots; P5 to the scaled network; P6-P7 to national or expanded-benefit operation; P8 to the mature national system.",
        "5. **Avoid false precision.** Most derived rates use whole percentage points. Uptime uses hundredths because each step corresponds to a materially different annual downtime budget.",
        "6. **Recalibrate with evidence.** Independent baseline evidence may justify changing a derived value. The change should be versioned here, retain the mature target, and explain why safety and progression remain protected.",
        "",
        "## Phase target register",
        "",
    ]
    for phase in payload["phases"]:
        lines.extend(
            [
                f'<a id="{phase["id"].lower()}"></a>',
                f'### {phase["id"]} — Year {phase["year"]}: {phase["title"]}',
                "",
                phase["summary"],
                "",
                "| Data-tab section | Parameter | Phase target | Mature source target | Basis | Justification |",
                "|---|---|---|---|---|---|",
            ]
        )
        for group in phase["groups"]:
            for metric in group["metrics"]:
                values = [
                    group["section"],
                    f'`{metric["id"]}` — {metric["name"]}',
                    metric["phaseTarget"],
                    metric["matureTarget"],
                    metric["basis"].title(),
                    metric["justification"],
                ]
                lines.append("| " + " | ".join(value.replace("|", "\\|") for value in values) + " |")
        lines.append("")
    lines.extend(
        [
            "## Controlled sources",
            "",
            "- `National_Health_Assurance_Framework_v2.0.0_FINAL.pdf` — complete KPP and TPP dictionaries; controlled phase and gate tables.",
            "- `docs/js/qualitydata.js` — reproducible dashboard extraction of the controlled dictionaries.",
            "- `tools/extract_quality_catalog.py` — extraction and count validation for the KPP, TPP, and CP catalogs.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    payload = build_payload()
    JS_OUTPUT.write_text(
        "window.NHA_DATA_PHASES="
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    DOC_OUTPUT.write_text(markdown(payload), encoding="utf-8")
    print(
        f"Wrote {JS_OUTPUT.relative_to(ROOT)} and {DOC_OUTPUT.relative_to(ROOT)}: "
        f"{payload['targetCount']} phase targets across {len(payload['phases'])} phases"
    )


if __name__ == "__main__":
    main()
