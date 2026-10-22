/* Dashboard-wide acronym glossary. The only acronym dictionary in the repo,
   and the only source of the hover expansions src/scripts/acronyms-client.ts
   attaches to inline prose and source copy on every tab. It absorbed the
   per-tab maps (legislation, data, hardening, workforce, quality, units) plus
   the governance entity roster (gov.ts codes) and the external bodies cited
   across the health, tax, ltc, medications, and overview tabs.

   The per-tab maps and their decorators are gone. Every one of them built its
   matcher with `\b`, and `-` is a non-word character, so `\bCP\b` matched the
   CP in CP-POP-004: on one load of the quality tab that wrapped 315 CP
   fragments where 3 were real prose. acronymPattern() below is the reason
   this cannot recur, and a build gate keeps the shape from coming back.

   Keep values free of em dashes (site rule) and free of source-document codes.
   Add an entry here; there is nowhere else to add one. */

export const ACRONYMS: Record<string, string> = {
  "A1-HCAC": "Article I Health Claims and Appeals Court",
  "AAMC": "Association of American Medical Colleges",
  "AARP": "AARP, an advocacy organization for older Americans",
  "ACA": "Affordable Care Act",
  "ACDRH": "Administration for Care Delivery and Regional Health",
  "ACS": "American Community Survey (Census Bureau)",
  "ADA": "American Diabetes Association",
  "AHIRC": "Administration for Health Information, Records, and Cybersecurity",
  "AHWCS": "Administration for Health Workforce, Compensation, and Scope",
  "AI": "Artificial Intelligence",
  "AICIO": "Artificial Intelligence Clinical Integration Office",
  "AJPH": "American Journal of Public Health",
  "AMA": "American Medical Association",
  "AMDDT": "Administration for Medicines, Devices, Diagnostics, and Therapeutics",
  "AMI": "Any mental illness, a national survey measure",
  "APA": "Administrative Procedure Act",
  "API": "Application Programming Interface",
  "ARPA-H": "Advanced Research Projects Agency for Health",
  "ASPE": "Office of the Assistant Secretary for Planning and Evaluation",
  "BARDA": "Biomedical Advanced Research and Development Authority",
  "BH": "Behavioral Health",
  "BLS": "Bureau of Labor Statistics",
  "BMJ": "BMJ, the medical publisher (formerly the British Medical Journal)",
  "BPCIA": "Biologics Price Competition and Innovation Act",
  "CBC": "Complete Blood Count",
  "CBO": "Congressional Budget Office",
  "CDC": "Centers for Disease Control and Prevention",
  "CES": "Consumer Expenditure Survey",
  "CEVI": "Comparative Effectiveness and Value Institute",
  "CFR": "Code of Federal Regulations",
  "CHAMPVA": "Civilian Health and Medical Program of the Department of Veterans Affairs",
  "CHAO": "Congressional Health Accountability Office",
  "CHIP": "Children's Health Insurance Program",
  "CIRBAS": "Clinician Identity and Role-Based Access System",
  "CIRCIA": "Cyber Incident Reporting for Critical Infrastructure Act",
  "CISA": "Cybersecurity and Infrastructure Security Agency",
  "CLIA": "Clinical Laboratory Improvement Amendments",
  "CMS": "Centers for Medicare & Medicaid Services",
  "COBRA": "Consolidated Omnibus Budget Reconciliation Act",
  "CONG": "Congress (statutory design authority)",
  "CP": "Cost Parameter",
  "CRS": "Congressional Research Service",
  "CVS": "CVS Health (originally Consumer Value Stores)",
  "DME": "Durable Medical Equipment",
  "DMRCO": "Data Migration and Records Continuity Office",
  "DNHA": "Department of National Health Assurance",
  "DNHA-SEC": "Office of the Secretary",
  "DOJ": "Department of Justice",
  "DUSO": "Drug Utilization and Safety Office",
  "DVH": "Dental, Vision, and Hearing",
  "ECG": "Electrocardiogram",
  "ED": "Emergency Department",
  "EH": "Executive-hardening control",
  "EHAC": "Employer Health Assurance Contribution",
  "EHR": "Electronic Health Record",
  "EHRM": "Electronic Health Record Modernization, the VA records program",
  "EMS": "Emergency Medical Services",
  "EMTALA": "Emergency Medical Treatment and Labor Act",
  "ENT": "Ear, nose, and throat",
  "EPTO": "Employer and Payroll Transition Office",
  "ERISA": "Employee Retirement Income Security Act",
  "EU": "European Union",
  "EURAXESS": "EURAXESS, the European Commission's researcher mobility network",
  "FA": "Specified assumption",
  "FDR": "Franklin D. Roosevelt",
  "FHIR": "Fast Healthcare Interoperability Resources, a health data exchange standard",
  "FMEA": "Failure Modes and Effects Analysis",
  "FCRA": "Fair Credit Reporting Act",
  "FDA": "Food and Drug Administration",
  "FDCA": "Federal Food, Drug, and Cosmetic Act",
  "FDCPA": "Fair Debt Collection Practices Act",
  "FEHBA": "Federal Employees Health Benefits Act",
  "FISMA": "Federal Information Security Modernization Act",
  "FLSA": "Fair Labor Standards Act",
  "FOIA": "Freedom of Information Act",
  "FQHC": "Federally Qualified Health Center",
  "FTC": "Federal Trade Commission",
  "FTE": "Full-Time Equivalent",
  "GADCS": "Medicare Ground Ambulance Data Collection System",
  "GAO": "Government Accountability Office",
  "GDP": "Gross Domestic Product",
  "GME": "Graduate Medical Education",
  "GPO": "Group purchasing organization",
  "HAAO": "Hospital Administrative Accountability Office",
  "HATC": "Health Administration Transition Corps",
  "HCBS": "Home and Community-Based Services",
  "HCCA": "Health Cybersecurity and Continuity Authority",
  "HCRB": "Health Credential Recognition Board",
  "HESSO": "Hospital and Essential Service Stabilization Office",
  "HFASB": "Health Financing Actuary and Stabilization Board",
  "HHS": "Department of Health and Human Services",
  "HIMSS": "Healthcare Information and Management Systems Society",
  "HIPAA": "Health Insurance Portability and Accountability Act",
  "HITECH": "Health Information Technology for Economic and Clinical Health Act",
  "HIV": "Human Immunodeficiency Virus",
  "HL7": "Health Level Seven International, a health data standards body",
  "HPSA": "Health Professional Shortage Area",
  "HR": "Human resources",
  "HRPO": "Health Rights and Privacy Office",
  "HRSA": "Health Resources and Services Administration",
  "HSA": "Health Savings Account",
  "HTIP": "Health Talent Immigration Pathway",
  "IBM": "International Business Machines",
  "ICU": "Intensive Care Unit",
  "IDX-CLAIMS": "Claims rail maturity index",
  "IDX-SPEC": "Specialist backplane maturity index",
  "IDX-WSI": "Workforce sufficiency index",
  "IEN": "Internationally Educated Nurse",
  "IHS": "Indian Health Service",
  "IMG": "International Medical Graduate",
  "INA": "Immigration and Nationality Act",
  "IQVIA": "IQVIA, a health data and analytics company",
  "IRA": "Inflation Reduction Act",
  "IRC": "Internal Revenue Code",
  "IRS": "Internal Revenue Service",
  "IRS-EWTAO": "IRS Extreme Wealth Tax Administration Office",
  "IT": "Information Technology",
  "JAMA": "Journal of the American Medical Association",
  "JCT": "Joint Committee on Taxation",
  "JFK": "John F. Kennedy",
  "KFF": "KFF, a health policy research organization",
  "KFF-NPR": "KFF (a health policy research organization) and NPR (National Public Radio)",
  "KPP": "Key Performance Parameter",
  "LBJ": "Lyndon B. Johnson",
  "LDA": "Laboratory and Diagnostics Authority",
  "LPN": "Licensed Practical Nurse",
  "LPWO": "Legacy Payer Wind-Down Office",
  "LTC": "Long-Term Care",
  "LTSS": "Long-Term Services and Supports",
  "MARB": "Medicine Access Review Board",
  "MAT": "Medication-Assisted Treatment",
  "MDSA": "Medical Device and Supply Authority",
  "MEPS": "Medical Expenditure Panel Survey",
  "MH": "Mental health",
  "MHPAEA": "Mental Health Parity and Addiction Equity Act",
  "MRI": "Magnetic Resonance Imaging",
  "MUA": "Medically Underserved Area",
  "MUP": "Medically Underserved Population",
  "NAIG": "National API and Interoperability Gateway",
  "NAT": "National Appeals Tribunal",
  "NBHA": "National Behavioral Health Authority",
  "NBIA": "National Biomedical Innovation Agency",
  "NCCA": "National Coverage and Claims Authority",
  "NCDSO": "National Clinical Data Standards Office",
  "NCDTN": "National Community Diagnostic and Treatment Network",
  "NCSWB": "National Clinical Scope and Workforce Board",
  "NDIF": "National Drug Innovation Fund",
  "NDPA": "National Drug Purchasing Authority",
  "NDVHO": "National Dental, Vision, and Hearing Benefit Office",
  "NEEA": "National Enrollment and Eligibility Authority",
  "NEMTA": "National EMS and Medical Transport Authority",
  "NFTSB": "National Formulary and Therapeutic Schedule Board",
  "NHA": "National Health Assurance",
  "NHA-TRUST": "National Health Assurance Trust",
  "NHAC": "National Health Accountability Commission",
  "NHAMCS": "National Hospital Ambulatory Medical Care Survey",
  "NHASB": "National Health Adaptation and Scorekeeping Board",
  "NHE": "National Health Expenditures",
  "NHETF": "National Health Equalization Trust Fund",
  "NHI": "National Health Insurance",
  "NHIS": "National Health Identifier Service",
  "NHRA": "National Health Records Authority",
  "NHSA": "National Hospital Stewardship Authority",
  "NHTCA": "National Health Transition and Continuity Authority",
  "NHTIB": "National Health Talent Immigration Board",
  "NHWB": "National Health Workforce Board",
  "NHWECA": "National Health Workforce Education and Capacity Authority",
  "NIH": "National Institutes of Health",
  "NLLHR": "National Longitudinal Health Record",
  "NLRA": "National Labor Relations Act",
  "NLTCA": "National Long-Term Care Authority",
  "NMPI": "National Master Patient Index",
  "NOPRSL": "National Office of Patient Rights, Safety, and Legitimacy",
  "NP": "Nurse practitioner",
  "NPCB": "National Physician Compensation Board",
  "NPHPA": "National Public Health and Prevention Authority",
  "NPSMIB": "National Patient Safety and Medical Injury Board",
  "NRLS": "National Record Locator Service",
  "NSAA": "National Specialty Access Authority",
  "NSDUH": "National Survey on Drug Use and Health",
  "NTSB": "National Transportation Safety Board",
  "OASDI": "Old-Age, Survivors, and Disability Insurance",
  "OBBBA": "One Big Beautiful Bill Act",
  "OCDTI": "Office of Community Diagnostic and Treatment Infrastructure",
  "OCR": "Office for Civil Rights (HHS)",
  "OECD": "Organisation for Economic Co-operation and Development",
  "OIG": "Office of Inspector General",
  "OIG-AF": "Office of Inspector General and Anti-Fraud",
  "OMB": "Office of Management and Budget",
  "ONC": "Office of the National Coordinator for Health Information Technology",
  "OOP": "Out-of-Pocket",
  "OT": "Occupational therapist",
  "PACE": "Program of All-Inclusive Care for the Elderly",
  "PACP": "Patient Access and Consent Portal",
  "PBM": "Pharmacy Benefit Manager",
  "PCE": "Personal Consumption Expenditures",
  "PCO": "Patient Continuity Office",
  "PCORI": "Patient-Centered Outcomes Research Institute",
  "PCU": "National Pharmacy Claims Utility",
  "PDCO": "Pharmacy and Drug Continuity Office",
  "PERI": "Political Economy Research Institute, University of Massachusetts Amherst",
  "PHI": "PHI, a direct-care workforce research organization",
  "PHSA": "Public Health Service Act",
  "PILO": "Public-Interest Licensing Office",
  "PLCCO": "Provider Liquidity and Claims Continuity Office",
  "PMC": "Public Medicines Corporation",
  "PPCO": "Private Plan Certification Office",
  "PREP": "Public Readiness and Emergency Preparedness Act",
  "PROO": "Patient Rights and Ombudsman Office",
  "PRTO": "Public Reporting and Transparency Office",
  "PSHCO": "Public Service Hospital Charter Office",
  "PT": "Physical therapist",
  "RAND": "RAND Corporation",
  "RFRA": "Religious Freedom Restoration Act",
  "RHA": "Regional Health Administrators",
  "RIF": "Reduction in force",
  "RN": "Registered Nurse",
  "ROI": "Return on Investment",
  "RPN": "Risk Priority Number",
  "RS-CORPS": "Rural Service Corps",
  "RUC": "AMA/Specialty Society Relative Value Scale Update Committee",
  "SAMHSA": "Substance Abuse and Mental Health Services Administration",
  "SCF": "Survey of Consumer Finances",
  "SOI": "Statistics of Income",
  "SR": "System requirement",
  "SR-DATA": "System requirement, data",
  "SRAE": "Secure Research and Analytics Enclave",
  "SRCO": "State and Regional Compact Office",
  "SS": "Social Security",
  "SSA": "Social Security Administration",
  "SSN": "Social Security number",
  "STI": "Sexually Transmitted Infection",
  "SUD": "Substance Use Disorder",
  "TBD": "To Be Determined",
  "TFAH": "Trust for America's Health",
  "THDO": "Treasury Health Disbursement Office",
  "TLSHO": "Transition Legal Safe Harbor Office",
  "TMTFO": "Translational Medicine and Trial Funding Office",
  "TPC": "Tax Policy Center",
  "TPP": "Technical Performance Parameter",
  "TREAS": "Department of the Treasury",
  "TRICARE": "Department of Defense health program for service members, retirees, and families",
  "TRPGO": "Transition Risk and Phase-Gate Office",
  "TRTO": "Tribal and Rural Transition Office",
  "UK": "United Kingdom",
  "UNC": "University of North Carolina",
  "URL": "Uniform Resource Locator, a web address",
  "US": "United States",
  "USC": "United States Code",
  "USD": "United States Dollars",
  "UTI": "Urinary tract infection",
  "VA": "Department of Veterans Affairs",
  "VAT": "Value-Added Tax",
  "VHA": "Veterans Health Administration",
  "WARN": "Worker Adjustment and Retraining Notification Act",
  "WHO": "World Health Organization",
};

/* Expansions a page may hardcode in an <abbr title> that the matcher above can
   never produce. This is not a second glossary: nothing reads it at runtime.
   It exists so that every acronym expansion in the repo is written in this one
   file, including the two that cannot be entries in ACRONYMS, and so the build
   gate has one place to check a page's typed title against.

   Review of P19 [S13]: these two started life inside the gate that forbids a
   second dictionary, where its own rule could not see them, because the rule
   looks for the name `ACRONYMS`. */
export const HARDCODED_ONLY: Record<string, string> = {
  /* The matcher cannot wrap a plural: the trailing s is a word character and
     the lookahead rejects it, so "PBMs" gets a hover only if a page types it. */
  "PBMs": "Pharmacy Benefit Managers",
  /* The lay overview says Emergency Room where the clinical chapters say
     Emergency Department. ED is the key ACRONYMS carries; ER is deliberately
     not one, because expanding it everywhere would put a colloquialism into
     chapters that avoid it. */
  "ER": "Emergency Room"
};

/* Two-character keys, each with the reason it is safe to expand site-wide.
 *
 * R101 [S13] asks for "a minimum key length or an explicit allow-context for
 * 2-character keys", and this is the allow-context. A short key is the one
 * that collides by accident: PA expanded to "Physician assistant" and read as
 * Pennsylvania on a map, which is what AE1 was. The lookaround in
 * acronymPattern() stops a key matching inside an identifier; it cannot stop a
 * key matching a different word that happens to be two letters.
 *
 * So a new two-letter entry has to be argued for here before the build accepts
 * it. Three of these expand nothing today and are kept as vocabulary rather
 * than deleted, which the reason column has to say out loud.
 */
export const SHORT_KEY_REASONS: Record<string, string> = {
  "AI": "no other reading in health-policy prose; 86 hovers site-wide",
  "BH": "behavioral health, used as a bare column label",
  "CP": "renders as its own type badge on 312 catalog rows",
  "ED": "emergency department; ER is the lay form and is not a key",
  "EH": "executive-hardening control ids only, so it expands nothing today",
  "EU": "European Union, in comparator prose",
  "FA": "specified assumption, one catalog badge",
  "IT": "collides with the English word only in lower case, which is not matched",
  /* the owner, 2026-10-11: every acronym a reader sees has a hover; these
     were drawn with none */
  "HR": "human resources, in a Governance entity's \"employer HR departments\"",
  "MH":"mental health, in a Healthcare source note's \"MH+SUD\"",
  "NP": "nurse practitioner, in the Units staffing line",
  "OT": "occupational therapist, in a Workforce wage table",
  "PT": "physical therapist, in a Workforce wage table",
  "RN": "registered nurse, used bare in workforce tables",
  "SR": "system requirement ids only, so it expands nothing today",
  "SS": "Social Security, in the payroll-cap instrument's label",
  "UK": "United Kingdom, in a Healthcare source note's comparator",
  "US": "United States, in a Healthcare source note's price comparison",
  "VA": "the agency, four times on health and legislation; Virginia is kept off "
    + "state-code containers by data-no-acronyms"
};

/* Matcher for standalone acronyms in a run of text. Longest keys first so
   "SR-DATA" wins over "SR"; the lookbehind and lookahead reject an adjacent
   word char, ampersand or hyphen so a key is never wrapped when it is really
   a fragment of a longer code ("CP" inside "CP-POP-004"). Exposed so the
   client decorator and its test share one definition.

   A slash used to be rejected too. The owner asked on 2026-10-11 that every
   acronym a reader sees have a hover, and the page sweep found prose pairs
   drawn with none: "RN/LPN", "HIV/STI", "FTC/DOJ/HHS", and the verifier
   "HFASB/NHASB" on Quality. A slash between two keys is prose. What the
   slash guarded is a key inside a slash-joined code chain ("SN-09/SN-16",
   "TPP-USE1/2"), and those are still refused: a key right after a slash
   that follows a hyphenated token, or right before a slash that leads to
   one, is a fragment of the chain. */
export function acronymPattern(): RegExp {
  const keys = Object.keys(ACRONYMS).sort((a, b) => b.length - a.length);
  const escaped = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp('(?<![\\w&-])(?<!-[\\w.]*\\/)(' + escaped.join('|') + ')(?![\\w&-])(?!\\/[\\w.]*-)', 'g');
}
