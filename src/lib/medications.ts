/* Medications portfolio data, ported from docs/js/medications.js (FAMILIES
   9-210, PHASE_META 212-217, ALL_DRUG_SPEND_2024, calcSavings). The id, name,
   form and tags of all 200 families are the ported values unchanged; what the
   record carries on top of them is described below. */
import { BASE2023, DEFLATOR_2023_TO_2024, PARAMS_BY_ID } from './params';

/* R176 [§S7]: the six inclusion reasons were free strings in a string[]
 * driving the tab's filters, so a misspelling dropped a family out of its
 * filter silently. Twelfth instance of the class. The vocabulary is the one
 * the medications methodology declares: immediate clinical criticality, high
 * routine volume, shortage or concentrated-production risk, price or access
 * inequity, maternal and child need, and emergency preparedness. */
export const FAMILY_TAGS = [
  'critical', 'high volume', 'shortage risk',
  'price and equity', 'maternal and child', 'preparedness'
] as const;
export type FamilyTag = (typeof FAMILY_TAGS)[number];

export type PhaseId = 'P5' | 'P6' | 'P7' | 'P8';

/* R175 [§S7]: the phasing principle, stated and made load-bearing.
 *
 * Phase assignment tracks manufacturing difficulty: oral solids first, then
 * sterile injectables, then device-combination and inhaled products, then
 * biologics. AZ4 inferred it from the data and called it coherent and
 * undocumented; BJ2 found it documented in the methodology and narrowed the
 * row to surfacing it. It matters most for insulin, which sits at Phase 8: a
 * reader has no way to know that reflects manufacturing complexity rather
 * than deprioritisation, while the Care chapter separately promises insulin
 * $0 earliest of all ten cards.
 *
 * Stating it in prose would leave it decorative. The record carries the
 * dosage-form class and the phase is derived from it, so the principle is the
 * only thing that assigns a phase: change a family's class and its phase
 * moves, and the published 61/116/11/12 counts break. */
export const FORM_CLASSES = [
  'oral solid', 'sterile', 'device or inhaled', 'biologic'
] as const;
export type FormClass = (typeof FORM_CLASSES)[number];

export const PHASE_FOR_CLASS: Record<FormClass, PhaseId> = {
  'oral solid': 'P5',
  'sterile': 'P6',
  'device or inhaled': 'P7',
  'biologic': 'P8'
};

/* R174 [§S7]: 200 families with no source, no confidence grade, and no field
 * for either, against a params.ts that grades and cites 31 parameters and a
 * care.ts that grades all 10 cards. BJ1 narrowed it: the sourcing exists in
 * the medications methodology, in a file this module never cited, so it is a
 * linking job.
 *
 * Per family, what there is to cite is how the family's phase was assigned.
 * For most of them the essential forms decide it and the rule is mechanical.
 * For fifteen they do not, and the family says why in its own words. The
 * source key records which of the two it is, and the confidence grade follows
 * from it: a mechanical assignment is `high`, a judgement is `medium`. Both
 * are read off the record rather than typed beside it, so neither can drift
 * away from what the data actually supports. */
export const FAMILY_SOURCES = {
  'form-class': 'The qualification phase follows the dosage-form class named ' +
    'in the family\'s own essential forms, under the manufacturing-complexity ' +
    'rule the medications methodology states for the portfolio.',
  'manufacturing-character': 'The essential forms alone do not decide the ' +
    'class. The phase follows the product\'s manufacturing character, and the ' +
    'family carries the reason.'
} as const;
export type FamilySource = keyof typeof FAMILY_SOURCES;
export type FamilyConfidence = 'high' | 'medium';

export interface FamilyRecord {
  id: string;
  name: string;
  form: string;
  formClass: FormClass;
  tags: FamilyTag[];
  /* Present only where the essential forms do not lead to formClass. Its
     presence is what makes the assignment a judgement, which is why the grade
     is read off it. */
  why?: string;
}

export interface Family extends FamilyRecord {
  phase: PhaseId;
  confidence: FamilyConfidence;
  source: FamilySource;
}

const RECORDS: FamilyRecord[] = [
  {
    id: 'PF-001', name: "Adenosine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-002', name: "Amiodarone",
    form: "oral solid and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-003', name: "Atropine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'preparedness']
  },
  {
    id: 'PF-004', name: "Dobutamine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-005', name: "Epinephrine",
    form: "sterile injection, prefilled syringe, and autoinjector",
    formClass: 'device or inhaled',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-006', name: "Norepinephrine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-007', name: "Phenylephrine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-008', name: "Vasopressin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-009', name: "Nitroglycerin",
    form: "sublingual oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-010', name: "Sodium nitroprusside",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-011', name: "Labetalol",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'maternal and child']
  },
  {
    id: 'PF-012', name: "Hydralazine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'maternal and child']
  },
  {
    id: 'PF-013', name: "Esmolol",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-014', name: "Furosemide",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-015', name: "Mannitol",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-016', name: "Propofol",
    form: "sterile injectable emulsion",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-017', name: "Etomidate",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-018', name: "Ketamine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-019', name: "Midazolam",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-020', name: "Lorazepam",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-021', name: "Dexmedetomidine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-022', name: "Lidocaine",
    form: "sterile local-anesthetic and antiarrhythmic injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-023', name: "Bupivacaine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-024', name: "Succinylcholine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-025', name: "Rocuronium",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-026', name: "Vecuronium",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-027', name: "Cisatracurium",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-028', name: "Neostigmine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-029', name: "Sugammadex",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-030', name: "Dantrolene",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-031', name: "Amoxicillin",
    form: "oral solid and pediatric liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-032', name: "Amoxicillin-clavulanate",
    form: "oral solid and pediatric liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-033', name: "Ampicillin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-034', name: "Penicillin G",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-035', name: "Piperacillin-tazobactam",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-036', name: "Cefazolin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'shortage risk']
  },
  {
    id: 'PF-037', name: "Ceftriaxone",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'shortage risk']
  },
  {
    id: 'PF-038', name: "Cefepime",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-039', name: "Ceftazidime",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-040', name: "Ceftazidime-avibactam",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-041', name: "Meropenem",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-042', name: "Imipenem-cilastatin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-043', name: "Ertapenem",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-044', name: "Azithromycin",
    form: "oral solid, liquid, and sterile injection",
    formClass: 'sterile',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-045', name: "Doxycycline",
    form: "oral solid and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'preparedness']
  },
  {
    id: 'PF-046', name: "Clindamycin",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-047', name: "Metronidazole",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-048', name: "Ciprofloxacin",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'preparedness']
  },
  {
    id: 'PF-049', name: "Levofloxacin",
    form: "oral, liquid, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'preparedness']
  },
  {
    id: 'PF-050', name: "Trimethoprim-sulfamethoxazole",
    form: "oral solid, liquid, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-051', name: "Vancomycin",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-052', name: "Linezolid",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-053', name: "Daptomycin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-054', name: "Gentamicin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-055', name: "Amikacin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-056', name: "Tobramycin",
    form: "sterile injection and ophthalmic solution",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-057', name: "Nitrofurantoin",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-058', name: "Fosfomycin",
    form: "oral powder",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-059', name: "Fluconazole",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-060', name: "Voriconazole",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-061', name: "Amphotericin B",
    form: "conventional and liposomal sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-062', name: "Micafungin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-063', name: "Acyclovir",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'maternal and child']
  },
  {
    id: 'PF-064', name: "Oseltamivir",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['critical', 'maternal and child', 'preparedness']
  },
  {
    id: 'PF-065', name: "Valganciclovir",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-066', name: "Aspirin",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-067', name: "Clopidogrel",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-068', name: "Ticagrelor",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-069', name: "Heparin",
    form: "sterile injection",
    formClass: 'biologic',
    tags: ['critical', 'shortage risk'],
    why:
      'Heparin is extracted from animal mucosal tissue and released on ' +
        'characterisation rather than on synthesis, so the qualification ' +
        'burden is a biologic one even though the presentation is a plain ' +
        'sterile injection.'
  },
  {
    id: 'PF-070', name: "Enoxaparin",
    form: "sterile injection and prefilled syringe",
    formClass: 'biologic',
    tags: ['critical', 'shortage risk'],
    why:
      'A low-molecular-weight fraction of the same animal-derived ' +
        'heparin, so the characterisation burden governs the phase rather ' +
        'than the prefilled syringe it is presented in.'
  },
  {
    id: 'PF-071', name: "Warfarin",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-072', name: "Apixaban",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-073', name: "Alteplase",
    form: "sterile biologic injection",
    formClass: 'biologic',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-074', name: "Tranexamic acid",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child', 'preparedness']
  },
  {
    id: 'PF-075', name: "Protamine",
    form: "sterile injection",
    formClass: 'biologic',
    tags: ['critical', 'shortage risk'],
    why:
      'Purified from a fish protein, so qualification turns on the ' +
        'biological source and its characterisation rather than on the ' +
        'sterile fill.'
  },
  {
    id: 'PF-076', name: "Phytonadione",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'maternal and child']
  },
  {
    id: 'PF-077', name: "Amlodipine",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-078', name: "Lisinopril",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-079', name: "Losartan",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-080', name: "Valsartan",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-081', name: "Metoprolol",
    form: "oral solid and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-082', name: "Carvedilol",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-083', name: "Diltiazem",
    form: "oral solid and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume']
  },
  {
    id: 'PF-084', name: "Verapamil",
    form: "oral solid and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume']
  },
  {
    id: 'PF-085', name: "Hydrochlorothiazide",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-086', name: "Chlorthalidone",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-087', name: "Spironolactone",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-088', name: "Atorvastatin",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-089', name: "Rosuvastatin",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-090', name: "Digoxin",
    form: "oral solid, liquid, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-091', name: "Isosorbide nitrates",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-092', name: "Sacubitril-valsartan",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-093', name: "Flecainide",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-094', name: "Sotalol",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-095', name: "Clonidine",
    form: "oral solid and transdermal patch",
    formClass: 'sterile',
    tags: ['high volume', 'price and equity'],
    why:
      'The transdermal patch is a laminated matrix with its own adhesion ' +
        'and release specifications, a harder process than the oral solid ' +
        'the form string leads with.'
  },
  {
    id: 'PF-096', name: "Regular human insulin",
    form: "vial, cartridge, pen, and sterile infusion presentation",
    formClass: 'biologic',
    tags: ['critical', 'high volume', 'price and equity'],
    why:
      'Insulin is regulated as a biologic, and the fermentation and ' +
        'purification train governs qualification rather than the vial, ' +
        'cartridge or pen it is filled into.'
  },
  {
    id: 'PF-097', name: "NPH human insulin",
    form: "vial and pen",
    formClass: 'biologic',
    tags: ['critical', 'high volume', 'price and equity'],
    why:
      'A biologic insulin presented as a suspension, so the fermentation ' +
        'and purification train governs qualification rather than the vial ' +
        'or pen it is filled into.'
  },
  {
    id: 'PF-098', name: "Insulin glargine",
    form: "vial, cartridge, and pen",
    formClass: 'biologic',
    tags: ['critical', 'high volume', 'price and equity'],
    why:
      'A biologic insulin analog, so the fermentation and purification ' +
        'train governs qualification rather than the vial, cartridge or pen ' +
        'it is filled into.'
  },
  {
    id: 'PF-099', name: "Insulin lispro",
    form: "vial, cartridge, and pen",
    formClass: 'biologic',
    tags: ['critical', 'high volume', 'price and equity'],
    why:
      'A biologic insulin analog, so the fermentation and purification ' +
        'train governs qualification rather than the vial, cartridge or pen ' +
        'it is filled into.'
  },
  {
    id: 'PF-100', name: "Metformin",
    form: "immediate- and extended-release oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-101', name: "Glipizide",
    form: "immediate- and extended-release oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-102', name: "Empagliflozin",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-103', name: "Semaglutide",
    form: "sterile injection and oral solid",
    formClass: 'sterile',
    tags: ['high volume', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-104', name: "Glucagon",
    form: "sterile injection and nasal powder",
    formClass: 'device or inhaled',
    tags: ['critical', 'price and equity'],
    why:
      'The nasal powder is a single-use unit-dose device presentation ' +
        'rather than a bulk solution, so the device constituent governs the ' +
        'phase.'
  },
  {
    id: 'PF-105', name: "Dextrose injection",
    form: "5%, 10%, and 50% sterile presentations",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-106', name: "Levothyroxine",
    form: "oral solid, liquid, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-107', name: "Methimazole",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-108', name: "Propylthiouracil",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'maternal and child']
  },
  {
    id: 'PF-109', name: "Hydrocortisone",
    form: "oral solid and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-110', name: "Prednisone",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-111', name: "Dexamethasone",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-112', name: "Methylprednisolone",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-113', name: "Desmopressin",
    form: "oral, nasal, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-114', name: "Calcium gluconate",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-115', name: "Magnesium sulfate",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-116', name: "Potassium chloride",
    form: "oral and sterile concentrate",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'shortage risk']
  },
  {
    id: 'PF-117', name: "Sodium bicarbonate",
    form: "oral solid, oral powder, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-118', name: "Sodium phosphate",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-119', name: "Sodium chloride intravenous solutions",
    form: "0.45%, 0.9%, and 3% sterile bags and small-volume presentations",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-120', name: "Lactated Ringer's solution",
    form: "sterile large-volume parenteral",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-121', name: "Acetaminophen",
    form: "oral solid, liquid, suppository, and sterile injection",
    formClass: 'sterile',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-122', name: "Ibuprofen",
    form: "oral solid and pediatric liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-123', name: "Morphine",
    form: "oral solid, liquid, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-124', name: "Hydromorphone",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-125', name: "Fentanyl",
    form: "sterile injection and transdermal system",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-126', name: "Oxycodone",
    form: "immediate-release oral solid and liquid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-127', name: "Buprenorphine-naloxone",
    form: "sublingual and buccal dosage forms",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'price and equity'],
    why:
      'Sublingual and buccal films are cast, dried and cut to a unit ' +
        'dose, a different and harder process than a compressed oral solid.'
  },
  {
    id: 'PF-128', name: "Methadone",
    form: "oral solid, liquid, and concentrate",
    formClass: 'oral solid',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-129', name: "Naloxone",
    form: "nasal and sterile injection",
    formClass: 'device or inhaled',
    tags: ['critical', 'high volume', 'price and equity', 'preparedness'],
    why:
      'The nasal spray is a single-use unit-dose device presentation ' +
        'carried for emergency use, so the device constituent governs ' +
        'rather than the injection.'
  },
  {
    id: 'PF-130', name: "Gabapentin",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-131', name: "Phenytoin-fosphenytoin",
    form: "oral dosage forms and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk']
  },
  {
    id: 'PF-132', name: "Levetiracetam",
    form: "oral solid, liquid, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'shortage risk']
  },
  {
    id: 'PF-133', name: "Valproate-divalproex",
    form: "oral dosage forms and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-134', name: "Carbamazepine",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-135', name: "Lamotrigine",
    form: "oral solid and dispersible",
    formClass: 'oral solid',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-136', name: "Diazepam",
    form: "oral, rectal, nasal, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'preparedness']
  },
  {
    id: 'PF-137', name: "Carbidopa-levodopa",
    form: "immediate- and extended-release oral dosage forms",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-138', name: "Sertraline",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-139', name: "Fluoxetine",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-140', name: "Escitalopram",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-141', name: "Bupropion",
    form: "immediate-, sustained-, and extended-release oral solid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-142', name: "Lithium",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity']
  },
  {
    id: 'PF-143', name: "Haloperidol",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-144', name: "Olanzapine",
    form: "oral solid, disintegrating, and short-acting injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-145', name: "Risperidone",
    form: "oral solid, liquid, disintegrating, and long-acting injection",
    formClass: 'device or inhaled',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-146', name: "Albuterol",
    form: "metered-dose inhaler and nebulizer solution",
    formClass: 'device or inhaled',
    tags: ['critical', 'high volume', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-147', name: "Ipratropium",
    form: "metered-dose inhaler and nebulizer solution",
    formClass: 'device or inhaled',
    tags: ['critical', 'high volume']
  },
  {
    id: 'PF-148', name: "Budesonide",
    form: "inhaler and nebulizer suspension",
    formClass: 'device or inhaled',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-149', name: "Fluticasone",
    form: "inhaled and intranasal dosage forms",
    formClass: 'device or inhaled',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-150', name: "Tiotropium",
    form: "inhaled powder and mist",
    formClass: 'device or inhaled',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-151', name: "Montelukast",
    form: "oral solid, chewable, and granules",
    formClass: 'oral solid',
    tags: ['high volume', 'maternal and child']
  },
  {
    id: 'PF-152', name: "Acetylcysteine",
    form: "inhaled, oral, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness'],
    why:
      'Its inhaled presentation is a nebuliser solution rather than a ' +
        'metered device, so it qualifies with the sterile products and not ' +
        'with the inhalers.'
  },
  {
    id: 'PF-153', name: "Diphenhydramine",
    form: "oral, topical, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume']
  },
  {
    id: 'PF-154', name: "Cetirizine",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-155', name: "Famotidine",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['high volume', 'shortage risk']
  },
  {
    id: 'PF-156', name: "Pantoprazole",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'shortage risk']
  },
  {
    id: 'PF-157', name: "Omeprazole",
    form: "oral solid and suspension",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-158', name: "Ondansetron",
    form: "oral, disintegrating, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'maternal and child']
  },
  {
    id: 'PF-159', name: "Metoclopramide",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-160', name: "Loperamide",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-161', name: "Lactulose",
    form: "oral liquid and rectal solution",
    formClass: 'oral solid',
    tags: ['critical', 'high volume', 'price and equity']
  },
  {
    id: 'PF-162', name: "Polyethylene glycol",
    form: "oral powder",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-163', name: "Senna",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity']
  },
  {
    id: 'PF-164', name: "Pancrelipase",
    form: "delayed-release oral capsules",
    formClass: 'sterile',
    tags: ['critical', 'price and equity'],
    why:
      'An animal-derived enzyme blend in a delayed-release capsule, ' +
        'released on enzymatic activity, so it qualifies later than a plain ' +
        'oral solid.'
  },
  {
    id: 'PF-165', name: "Mesalamine",
    form: "oral delayed-release and rectal dosage forms",
    formClass: 'sterile',
    tags: ['critical', 'price and equity'],
    why:
      'Delayed-release and rectal presentations with site-specific ' +
        'release specifications, a harder process than the oral solid the ' +
        'form string leads with.'
  },
  {
    id: 'PF-166', name: "Oxytocin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-167', name: "Misoprostol",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-168', name: "Mifepristone",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-169', name: "Methylergonovine",
    form: "oral solid and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-170', name: "Carboprost",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-171', name: "Nifedipine",
    form: "immediate- and extended-release oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'high volume', 'maternal and child']
  },
  {
    id: 'PF-172', name: "Folic acid",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-173', name: "Ferrous sulfate",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-174', name: "Rho(D) immune globulin",
    form: "sterile biologic injection",
    formClass: 'biologic',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-175', name: "Caffeine citrate",
    form: "oral solution and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-176', name: "Pulmonary surfactant",
    form: "sterile intratracheal suspension",
    formClass: 'biologic',
    tags: ['critical', 'shortage risk', 'maternal and child'],
    why:
      'Extracted from animal lung tissue and released on biophysical ' +
        'activity, so the characterisation burden governs rather than the ' +
        'sterile suspension.'
  },
  {
    id: 'PF-177', name: "Erythromycin ophthalmic",
    form: "sterile ophthalmic ointment",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'maternal and child']
  },
  {
    id: 'PF-178', name: "Oral rehydration salts",
    form: "oral powder for solution",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity', 'maternal and child', 'preparedness']
  },
  {
    id: 'PF-179', name: "Ethinyl estradiol-levonorgestrel",
    form: "combined oral contraceptive",
    formClass: 'oral solid',
    tags: ['high volume', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-180', name: "Levonorgestrel emergency contraception",
    form: "oral solid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-181', name: "Cyclophosphamide",
    form: "oral and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-182', name: "Methotrexate",
    form: "oral solid and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-183', name: "Fluorouracil",
    form: "sterile injection and topical",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-184', name: "Cisplatin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-185', name: "Carboplatin",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-186', name: "Paclitaxel",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-187', name: "Vincristine",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-188', name: "Hydroxyurea",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['critical', 'price and equity', 'maternal and child']
  },
  {
    id: 'PF-189', name: "Filgrastim",
    form: "sterile biologic injection",
    formClass: 'biologic',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-190', name: "Tacrolimus",
    form: "oral solid, liquid, and sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'price and equity']
  },
  {
    id: 'PF-191', name: "Activated charcoal",
    form: "oral suspension and powder",
    formClass: 'oral solid',
    tags: ['critical', 'preparedness']
  },
  {
    id: 'PF-192', name: "Fomepizole",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-193', name: "Hydroxocobalamin",
    form: "sterile injection kit",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-194', name: "Sodium nitrite-sodium thiosulfate",
    form: "co-packaged sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-195', name: "Pralidoxime",
    form: "sterile injection and autoinjector",
    formClass: 'device or inhaled',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-196', name: "Atropine-pralidoxime autoinjector",
    form: "dual-chamber autoinjector",
    formClass: 'device or inhaled',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-197', name: "Potassium iodide",
    form: "oral solid and liquid",
    formClass: 'oral solid',
    tags: ['critical', 'maternal and child', 'preparedness']
  },
  {
    id: 'PF-198', name: "Methylene blue",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-199', name: "Digoxin immune Fab",
    form: "sterile biologic injection",
    formClass: 'biologic',
    tags: ['critical', 'shortage risk', 'preparedness']
  },
  {
    id: 'PF-200', name: "Calcium and zinc DTPA",
    form: "sterile injection",
    formClass: 'sterile',
    tags: ['critical', 'shortage risk', 'preparedness']
  }
];

export function familySource(r: FamilyRecord): FamilySource {
  return r.why ? 'manufacturing-character' : 'form-class';
}

export function familyConfidence(r: FamilyRecord): FamilyConfidence {
  return r.why ? 'medium' : 'high';
}

export const FAMILIES: Family[] = RECORDS.map((r) => ({
  ...r,
  phase: PHASE_FOR_CLASS[r.formClass],
  confidence: familyConfidence(r),
  source: familySource(r)
}));

/* The class the essential forms lead to on their own. Deliberately small and
 * conservative: it reads device-combination markers first, because a product
 * assembled with a device constituent qualifies later than the same molecule
 * in a vial, then sterile markers. A nebuliser solution is a solution, so
 * `nebulizer` is not a device marker; `inhaler` and `metered-dose` are.
 *
 * This is not how a family's class is set. It is the independent reading the
 * declared class is measured against, which is what stops the phase check
 * from being the tautology R52 was filed for elsewhere in this module. */
const DEVICE_MARKERS = [
  'inhal', 'metered-dose', 'autoinjector', 'prefilled syringe',
  'dual-chamber', 'long-acting injection', 'intratracheal', 'mist'
];
const STERILE_MARKERS = ['sterile', 'injection', 'parenteral'];

export function formClassFromForm(form: string): FormClass {
  const f = form.toLowerCase();
  if (f.includes('biologic')) return 'biologic';
  if (DEVICE_MARKERS.some((m) => f.includes(m))) return 'device or inhaled';
  if (STERILE_MARKERS.some((m) => f.includes(m))) return 'sterile';
  return 'oral solid';
}

/* Held equal to the measured set in both directions, the pattern §S6b's three
 * exception lists use. A family whose forms disagree with its class and says
 * nothing fails the build; so does a family carrying a reason it no longer
 * needs. `records` is a parameter for the reason `unknownOverrideKeys` takes
 * its catalog as one: a check that can only be run against the live data
 * cannot be probed with a fabricated case. */
export const FAMILY_WHY_FLOOR = 60;

export function undeclaredFormClasses(records: FamilyRecord[] = RECORDS): string[] {
  return records
    .filter((r) => formClassFromForm(r.form) !== r.formClass && !r.why)
    .map((r) => r.id + ' ' + r.name + ': forms read as ' +
      formClassFromForm(r.form) + ', declared ' + r.formClass);
}

export function staleFormClassDeclarations(records: FamilyRecord[] = RECORDS): string[] {
  return records
    .filter((r) => r.why !== undefined && formClassFromForm(r.form) === r.formClass)
    .map((r) => r.id + ' ' + r.name);
}

export function shallowFormClassReasons(records: FamilyRecord[] = RECORDS): string[] {
  return records
    .filter((r) => r.why !== undefined && r.why.length < FAMILY_WHY_FLOOR)
    .map((r) => r.id + ' (' + (r.why || '').length + ' chars)');
}

export function unknownFamilyTags(records: FamilyRecord[] = RECORDS): string[] {
  const known = new Set<string>(FAMILY_TAGS);
  const bad: string[] = [];
  for (const r of records) {
    for (const t of r.tags) if (!known.has(t)) bad.push(r.id + ' -> ' + t);
  }
  return bad;
}

/* Every declared tag has to be used by something, or the filter offers a
 * reason no family carries. */
export function unusedFamilyTags(records: FamilyRecord[] = RECORDS): string[] {
  const used = new Set<string>();
  for (const r of records) for (const t of r.tags) used.add(t);
  return FAMILY_TAGS.filter((t) => !used.has(t));
}

export function familyPhaseCounts(families: Family[] = FAMILIES): Record<PhaseId, number> {
  const out: Record<PhaseId, number> = { P5: 0, P6: 0, P7: 0, P8: 0 };
  for (const f of families) out[f.phase] += 1;
  return out;
}

export function familyGradeCounts(families: Family[] = FAMILIES): Record<FamilyConfidence, number> {
  const out: Record<FamilyConfidence, number> = { high: 0, medium: 0 };
  for (const f of families) out[f.confidence] += 1;
  return out;
}

/* R175 [§S7]: the principle in one sentence per phase, for the tab. Built from
 * PHASE_FOR_CLASS so a class that moves phase cannot leave the caption behind. */
export function phasePrinciple(): Array<{ phase: PhaseId; formClass: FormClass }> {
  return FORM_CLASSES.map((c) => ({ phase: PHASE_FOR_CLASS[c], formClass: c }));
}

export const PHASE_META: Record<string, string> = {
  P5: "Phase 5 · Year 7",
  P6: "Phase 6 · Year 8",
  P7: "Phase 7 · Year 10",
  P8: "Phase 8 · Year 12"
};

/* R214 + R296 [§S7]: one owner for the retail drug line, and both the tile and
 * the spend bar derived from it.
 *
 * The page used to print "$467B retail prescription drugs in 2024 · Official
 * CMS account, up 7.9% from 2023" three cards above the $717.9B drug base.
 * Dividing the page's own figure by its own growth rate gives a 2023 retail
 * base of $432.8B; the model calibrates on $449.7B. $16.9B apart, with every
 * term on the page, and the model's component the higher of the two.
 *
 * The line this repository owns is BASE2023.rxRetail. Two things settle it:
 *
 *  - SiteHeader publishes the convention on all fourteen pages: real 2024
 *    dollars, calibrated to CMS National Health Expenditure data for 2023, the
 *    last finalized year. A CMS 2024 actual and a 2023-calibrated figure
 *    deflated for display are different quantities, so the page was putting
 *    two numbers side by side that its own header says are not comparable.
 *  - research/03's 2024 NHE table, which is where the $467.0B came from,
 *    records that the CMS source PDF returned HTTP 403 on direct fetch and
 *    that its figures are drawn from search-result excerpts. It asks for a
 *    human re-pull. The 2023 table in research/01 was read whole, and it is
 *    the one params.ts calibrates on.
 *
 * So the retail component of the drug base is the 2023 line expressed in real
 * 2024 dollars. The page says that rather than borrowing a CMS 2024 number to
 * label a segment the model produced. */
export const DRUG_BASE = (function () {
  const embedded = PARAMS_BY_ID.embeddedDrugSpend;
  const d = DEFLATOR_2023_TO_2024;
  const retail = BASE2023.rxRetail * d;
  const nonRetail = embedded.mode * d;
  const total = retail + nonRetail;
  return {
    calibrationYear: 2023,
    displayYear: 2024,
    /* The owned CMS line, in its own year and its own dollars. */
    retail2023: BASE2023.rxRetail,
    /* The same line, and the modal non-retail estimate, in display dollars. */
    retail, nonRetail, total,
    retailPct: (retail / total) * 100,
    nonRetailPct: (nonRetail / total) * 100,
    /* R173 [§S7]: the base is modal, not fixed. embeddedDrugSpend is a
     * distribution and the engine samples it, so the drug base the model
     * actually runs on spans this range. */
    low: (BASE2023.rxRetail + embedded.low) * d,
    high: (BASE2023.rxRetail + embedded.high) * d
  };
})();

/* The savings calculator's fixed base. §Z established this module gets
 * non-additive attribution right and §BY4 verified every figure it produces,
 * so the literal stays and the derivation is checked against it rather than
 * replacing it: DRUG_BASE.total is 717.8922, which is this number at the
 * precision the page publishes. A self-test holds the two together. */
export const ALL_DRUG_SPEND_2024 = 717.9;

export function calcSavings(share: number, reduction: number): number {
  return ALL_DRUG_SPEND_2024 * share / 100 * reduction / 100;
}

/* R173 + R204 [§S7]: the base is modal and it is dated, and the chapter says
 * both. R173 found every savings figure on the tab computed at a point
 * estimate against a bare constant, while the parameter underneath it is a
 * distribution the engine samples. R204 found a 2024-scale figure driving a
 * tab whose sibling modules calibrate on 2023, with the base year stated
 * nowhere on the tab.
 *
 * Built from DRUG_BASE rather than typed beside it, for the reason P8 ended
 * on: a reader-facing sentence written by hand, in a file where every other
 * count was derived, said something the code did not do. The self-test holds
 * this to the five figures it has to state, not to its wording, so it can be
 * rewritten freely. */
export function drugBaseNote(): string {
  const b = DRUG_BASE;
  return 'Every dollar figure in this chapter is in real ' + b.displayYear +
    ' dollars, calibrated on the CMS account for ' + b.calibrationYear +
    ', the last finalized year. The $' + b.total.toFixed(1) +
    'B drug base is a modal value rather than a fixed one: the model samples ' +
    'the non-retail estimate, so the base it actually runs on spans $' +
    b.low.toFixed(1) + 'B to $' + b.high.toFixed(1) +
    'B. The savings figures here are computed at the mode, and they move with it.';
}

/* The values the note has to state for a reader to know what the figures are.
 * Held as data so a rewrite of the sentence cannot quietly drop one. */
export const DRUG_BASE_NOTE_FIGURES = [
  String(DRUG_BASE.displayYear),
  String(DRUG_BASE.calibrationYear),
  DRUG_BASE.total.toFixed(1),
  DRUG_BASE.low.toFixed(1),
  DRUG_BASE.high.toFixed(1)
];
