/* =========================================================================
 * Medications chapter: public-production portfolio and savings attribution.
 * ========================================================================= */
"use strict";
(function () {
  var NHA = window.NHA || {};
  window.NHA = NHA;

  var FAMILIES = [
    ["PF-001", "Adenosine", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-002", "Amiodarone", "oral solid and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-003", "Atropine", "sterile injection", "P6", ["critical", "preparedness"]],
    ["PF-004", "Dobutamine", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-005", "Epinephrine", "sterile injection, prefilled syringe, and autoinjector", "P7", ["critical", "shortage risk", "preparedness"]],
    ["PF-006", "Norepinephrine", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-007", "Phenylephrine", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-008", "Vasopressin", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-009", "Nitroglycerin", "sublingual oral and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-010", "Sodium nitroprusside", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-011", "Labetalol", "sterile injection", "P6", ["critical", "maternal and child"]],
    ["PF-012", "Hydralazine", "sterile injection", "P6", ["critical", "maternal and child"]],
    ["PF-013", "Esmolol", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-014", "Furosemide", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-015", "Mannitol", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-016", "Propofol", "sterile injectable emulsion", "P6", ["critical", "shortage risk"]],
    ["PF-017", "Etomidate", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-018", "Ketamine", "sterile injection", "P6", ["critical", "shortage risk", "preparedness"]],
    ["PF-019", "Midazolam", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-020", "Lorazepam", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-021", "Dexmedetomidine", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-022", "Lidocaine", "sterile local-anesthetic and antiarrhythmic injection", "P6", ["critical", "shortage risk"]],
    ["PF-023", "Bupivacaine", "sterile injection", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-024", "Succinylcholine", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-025", "Rocuronium", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-026", "Vecuronium", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-027", "Cisatracurium", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-028", "Neostigmine", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-029", "Sugammadex", "sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-030", "Dantrolene", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-031", "Amoxicillin", "oral solid and pediatric liquid", "P5", ["high volume", "price and equity", "maternal and child"]],
    ["PF-032", "Amoxicillin-clavulanate", "oral solid and pediatric liquid", "P5", ["high volume", "price and equity", "maternal and child"]],
    ["PF-033", "Ampicillin", "sterile injection", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-034", "Penicillin G", "sterile injection", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-035", "Piperacillin-tazobactam", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-036", "Cefazolin", "sterile injection", "P6", ["critical", "high volume", "shortage risk"]],
    ["PF-037", "Ceftriaxone", "sterile injection", "P6", ["critical", "high volume", "shortage risk"]],
    ["PF-038", "Cefepime", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-039", "Ceftazidime", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-040", "Ceftazidime-avibactam", "sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-041", "Meropenem", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-042", "Imipenem-cilastatin", "sterile injection", "P6", ["critical", "shortage risk", "preparedness"]],
    ["PF-043", "Ertapenem", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-044", "Azithromycin", "oral solid, liquid, and sterile injection", "P6", ["high volume", "price and equity", "maternal and child"]],
    ["PF-045", "Doxycycline", "oral solid and sterile injection", "P6", ["critical", "high volume", "preparedness"]],
    ["PF-046", "Clindamycin", "oral and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-047", "Metronidazole", "oral and sterile injection", "P6", ["critical", "high volume", "price and equity"]],
    ["PF-048", "Ciprofloxacin", "oral and sterile injection", "P6", ["critical", "preparedness"]],
    ["PF-049", "Levofloxacin", "oral, liquid, and sterile injection", "P6", ["critical", "preparedness"]],
    ["PF-050", "Trimethoprim-sulfamethoxazole", "oral solid, liquid, and sterile injection", "P6", ["critical", "high volume", "price and equity"]],
    ["PF-051", "Vancomycin", "oral and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-052", "Linezolid", "oral and sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-053", "Daptomycin", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-054", "Gentamicin", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-055", "Amikacin", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-056", "Tobramycin", "sterile injection and ophthalmic solution", "P6", ["critical", "shortage risk"]],
    ["PF-057", "Nitrofurantoin", "oral solid and liquid", "P5", ["high volume", "price and equity"]],
    ["PF-058", "Fosfomycin", "oral powder", "P5", ["high volume", "price and equity"]],
    ["PF-059", "Fluconazole", "oral and sterile injection", "P6", ["critical", "price and equity"]],
    ["PF-060", "Voriconazole", "oral and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-061", "Amphotericin B", "conventional and liposomal sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-062", "Micafungin", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-063", "Acyclovir", "oral and sterile injection", "P6", ["critical", "maternal and child"]],
    ["PF-064", "Oseltamivir", "oral solid and liquid", "P5", ["critical", "maternal and child", "preparedness"]],
    ["PF-065", "Valganciclovir", "oral solid and liquid", "P5", ["critical", "price and equity"]],
    ["PF-066", "Aspirin", "oral solid", "P5", ["critical", "high volume", "price and equity"]],
    ["PF-067", "Clopidogrel", "oral solid", "P5", ["critical", "high volume", "price and equity"]],
    ["PF-068", "Ticagrelor", "oral solid", "P5", ["critical", "price and equity"]],
    ["PF-069", "Heparin", "sterile injection", "P8", ["critical", "shortage risk"]],
    ["PF-070", "Enoxaparin", "sterile injection and prefilled syringe", "P8", ["critical", "shortage risk"]],
    ["PF-071", "Warfarin", "oral solid", "P5", ["critical", "price and equity"]],
    ["PF-072", "Apixaban", "oral solid", "P5", ["critical", "high volume", "price and equity"]],
    ["PF-073", "Alteplase", "sterile biologic injection", "P8", ["critical", "shortage risk", "price and equity"]],
    ["PF-074", "Tranexamic acid", "oral and sterile injection", "P6", ["critical", "shortage risk", "maternal and child", "preparedness"]],
    ["PF-075", "Protamine", "sterile injection", "P8", ["critical", "shortage risk"]],
    ["PF-076", "Phytonadione", "oral and sterile injection", "P6", ["critical", "maternal and child"]],
    ["PF-077", "Amlodipine", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-078", "Lisinopril", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-079", "Losartan", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-080", "Valsartan", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-081", "Metoprolol", "oral solid and sterile injection", "P6", ["critical", "high volume", "price and equity"]],
    ["PF-082", "Carvedilol", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-083", "Diltiazem", "oral solid and sterile injection", "P6", ["critical", "high volume"]],
    ["PF-084", "Verapamil", "oral solid and sterile injection", "P6", ["critical", "high volume"]],
    ["PF-085", "Hydrochlorothiazide", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-086", "Chlorthalidone", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-087", "Spironolactone", "oral solid and liquid", "P5", ["high volume", "price and equity"]],
    ["PF-088", "Atorvastatin", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-089", "Rosuvastatin", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-090", "Digoxin", "oral solid, liquid, and sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-091", "Isosorbide nitrates", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-092", "Sacubitril-valsartan", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-093", "Flecainide", "oral solid", "P5", ["critical", "price and equity"]],
    ["PF-094", "Sotalol", "oral solid", "P5", ["critical", "price and equity"]],
    ["PF-095", "Clonidine", "oral solid and transdermal patch", "P6", ["high volume", "price and equity"]],
    ["PF-096", "Regular human insulin", "vial, cartridge, pen, and sterile infusion presentation", "P8", ["critical", "high volume", "price and equity"]],
    ["PF-097", "NPH human insulin", "vial and pen", "P8", ["critical", "high volume", "price and equity"]],
    ["PF-098", "Insulin glargine", "vial, cartridge, and pen", "P8", ["critical", "high volume", "price and equity"]],
    ["PF-099", "Insulin lispro", "vial, cartridge, and pen", "P8", ["critical", "high volume", "price and equity"]],
    ["PF-100", "Metformin", "immediate- and extended-release oral solid and liquid", "P5", ["high volume", "price and equity"]],
    ["PF-101", "Glipizide", "immediate- and extended-release oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-102", "Empagliflozin", "oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-103", "Semaglutide", "sterile injection and oral solid", "P6", ["high volume", "shortage risk", "price and equity"]],
    ["PF-104", "Glucagon", "sterile injection and nasal powder", "P7", ["critical", "price and equity"]],
    ["PF-105", "Dextrose injection", "5%, 10%, and 50% sterile presentations", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-106", "Levothyroxine", "oral solid, liquid, and sterile injection", "P6", ["critical", "high volume", "price and equity"]],
    ["PF-107", "Methimazole", "oral solid", "P5", ["critical", "price and equity"]],
    ["PF-108", "Propylthiouracil", "oral solid", "P5", ["critical", "maternal and child"]],
    ["PF-109", "Hydrocortisone", "oral solid and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-110", "Prednisone", "oral solid and liquid", "P5", ["high volume", "price and equity"]],
    ["PF-111", "Dexamethasone", "oral and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-112", "Methylprednisolone", "oral and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-113", "Desmopressin", "oral, nasal, and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-114", "Calcium gluconate", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-115", "Magnesium sulfate", "sterile injection", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-116", "Potassium chloride", "oral and sterile concentrate", "P6", ["critical", "high volume", "shortage risk"]],
    ["PF-117", "Sodium bicarbonate", "oral solid, oral powder, and sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-118", "Sodium phosphate", "sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-119", "Sodium chloride intravenous solutions", "0.45%, 0.9%, and 3% sterile bags and small-volume presentations", "P6", ["critical", "shortage risk", "preparedness"]],
    ["PF-120", "Lactated Ringer's solution", "sterile large-volume parenteral", "P6", ["critical", "shortage risk", "preparedness"]],
    ["PF-121", "Acetaminophen", "oral solid, liquid, suppository, and sterile injection", "P6", ["high volume", "price and equity", "maternal and child"]],
    ["PF-122", "Ibuprofen", "oral solid and pediatric liquid", "P5", ["high volume", "price and equity", "maternal and child"]],
    ["PF-123", "Morphine", "oral solid, liquid, and sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-124", "Hydromorphone", "oral and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-125", "Fentanyl", "sterile injection and transdermal system", "P6", ["critical", "shortage risk"]],
    ["PF-126", "Oxycodone", "immediate-release oral solid and liquid", "P5", ["critical", "price and equity"]],
    ["PF-127", "Buprenorphine-naloxone", "sublingual and buccal dosage forms", "P6", ["critical", "high volume", "price and equity"]],
    ["PF-128", "Methadone", "oral solid, liquid, and concentrate", "P5", ["critical", "high volume", "price and equity"]],
    ["PF-129", "Naloxone", "nasal and sterile injection", "P7", ["critical", "high volume", "price and equity", "preparedness"]],
    ["PF-130", "Gabapentin", "oral solid and liquid", "P5", ["high volume", "price and equity"]],
    ["PF-131", "Phenytoin-fosphenytoin", "oral dosage forms and sterile injection", "P6", ["critical", "shortage risk"]],
    ["PF-132", "Levetiracetam", "oral solid, liquid, and sterile injection", "P6", ["critical", "high volume", "shortage risk"]],
    ["PF-133", "Valproate-divalproex", "oral dosage forms and sterile injection", "P6", ["critical", "high volume", "price and equity"]],
    ["PF-134", "Carbamazepine", "oral solid and liquid", "P5", ["critical", "price and equity"]],
    ["PF-135", "Lamotrigine", "oral solid and dispersible", "P5", ["critical", "high volume", "price and equity"]],
    ["PF-136", "Diazepam", "oral, rectal, nasal, and sterile injection", "P6", ["critical", "preparedness"]],
    ["PF-137", "Carbidopa-levodopa", "immediate- and extended-release oral dosage forms", "P5", ["critical", "price and equity"]],
    ["PF-138", "Sertraline", "oral solid and liquid", "P5", ["high volume", "price and equity", "maternal and child"]],
    ["PF-139", "Fluoxetine", "oral solid and liquid", "P5", ["high volume", "price and equity", "maternal and child"]],
    ["PF-140", "Escitalopram", "oral solid and liquid", "P5", ["high volume", "price and equity"]],
    ["PF-141", "Bupropion", "immediate-, sustained-, and extended-release oral solid", "P5", ["high volume", "price and equity"]],
    ["PF-142", "Lithium", "oral solid and liquid", "P5", ["critical", "price and equity"]],
    ["PF-143", "Haloperidol", "oral and sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-144", "Olanzapine", "oral solid, disintegrating, and short-acting injection", "P6", ["critical", "high volume", "price and equity"]],
    ["PF-145", "Risperidone", "oral solid, liquid, disintegrating, and long-acting injection", "P7", ["critical", "high volume", "price and equity"]],
    ["PF-146", "Albuterol", "metered-dose inhaler and nebulizer solution", "P7", ["critical", "high volume", "shortage risk", "price and equity"]],
    ["PF-147", "Ipratropium", "metered-dose inhaler and nebulizer solution", "P7", ["critical", "high volume"]],
    ["PF-148", "Budesonide", "inhaler and nebulizer suspension", "P7", ["high volume", "price and equity", "maternal and child"]],
    ["PF-149", "Fluticasone", "inhaled and intranasal dosage forms", "P7", ["high volume", "price and equity"]],
    ["PF-150", "Tiotropium", "inhaled powder and mist", "P7", ["high volume", "price and equity"]],
    ["PF-151", "Montelukast", "oral solid, chewable, and granules", "P5", ["high volume", "maternal and child"]],
    ["PF-152", "Acetylcysteine", "inhaled, oral, and sterile injection", "P6", ["critical", "shortage risk", "preparedness"]],
    ["PF-153", "Diphenhydramine", "oral, topical, and sterile injection", "P6", ["critical", "high volume"]],
    ["PF-154", "Cetirizine", "oral solid and liquid", "P5", ["high volume", "price and equity", "maternal and child"]],
    ["PF-155", "Famotidine", "oral and sterile injection", "P6", ["high volume", "shortage risk"]],
    ["PF-156", "Pantoprazole", "oral and sterile injection", "P6", ["critical", "high volume", "shortage risk"]],
    ["PF-157", "Omeprazole", "oral solid and suspension", "P5", ["high volume", "price and equity"]],
    ["PF-158", "Ondansetron", "oral, disintegrating, and sterile injection", "P6", ["critical", "high volume", "maternal and child"]],
    ["PF-159", "Metoclopramide", "oral and sterile injection", "P6", ["critical", "high volume", "price and equity"]],
    ["PF-160", "Loperamide", "oral solid and liquid", "P5", ["high volume", "price and equity"]],
    ["PF-161", "Lactulose", "oral liquid and rectal solution", "P5", ["critical", "high volume", "price and equity"]],
    ["PF-162", "Polyethylene glycol", "oral powder", "P5", ["high volume", "price and equity"]],
    ["PF-163", "Senna", "oral solid and liquid", "P5", ["high volume", "price and equity"]],
    ["PF-164", "Pancrelipase", "delayed-release oral capsules", "P6", ["critical", "price and equity"]],
    ["PF-165", "Mesalamine", "oral delayed-release and rectal dosage forms", "P6", ["critical", "price and equity"]],
    ["PF-166", "Oxytocin", "sterile injection", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-167", "Misoprostol", "oral solid", "P5", ["critical", "price and equity", "maternal and child"]],
    ["PF-168", "Mifepristone", "oral solid", "P5", ["critical", "price and equity", "maternal and child"]],
    ["PF-169", "Methylergonovine", "oral solid and sterile injection", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-170", "Carboprost", "sterile injection", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-171", "Nifedipine", "immediate- and extended-release oral solid", "P5", ["critical", "high volume", "maternal and child"]],
    ["PF-172", "Folic acid", "oral solid and liquid", "P5", ["high volume", "price and equity", "maternal and child"]],
    ["PF-173", "Ferrous sulfate", "oral solid and liquid", "P5", ["high volume", "price and equity", "maternal and child"]],
    ["PF-174", "Rho(D) immune globulin", "sterile biologic injection", "P8", ["critical", "shortage risk", "maternal and child"]],
    ["PF-175", "Caffeine citrate", "oral solution and sterile injection", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-176", "Pulmonary surfactant", "sterile intratracheal suspension", "P8", ["critical", "shortage risk", "maternal and child"]],
    ["PF-177", "Erythromycin ophthalmic", "sterile ophthalmic ointment", "P6", ["critical", "shortage risk", "maternal and child"]],
    ["PF-178", "Oral rehydration salts", "oral powder for solution", "P5", ["critical", "price and equity", "maternal and child", "preparedness"]],
    ["PF-179", "Ethinyl estradiol-levonorgestrel", "combined oral contraceptive", "P5", ["high volume", "price and equity", "maternal and child"]],
    ["PF-180", "Levonorgestrel emergency contraception", "oral solid", "P5", ["critical", "price and equity", "maternal and child"]],
    ["PF-181", "Cyclophosphamide", "oral and sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-182", "Methotrexate", "oral solid and sterile injection", "P6", ["critical", "shortage risk", "price and equity", "maternal and child"]],
    ["PF-183", "Fluorouracil", "sterile injection and topical", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-184", "Cisplatin", "sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-185", "Carboplatin", "sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-186", "Paclitaxel", "sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-187", "Vincristine", "sterile injection", "P6", ["critical", "shortage risk", "price and equity", "maternal and child"]],
    ["PF-188", "Hydroxyurea", "oral solid and liquid", "P5", ["critical", "price and equity", "maternal and child"]],
    ["PF-189", "Filgrastim", "sterile biologic injection", "P8", ["critical", "shortage risk", "price and equity"]],
    ["PF-190", "Tacrolimus", "oral solid, liquid, and sterile injection", "P6", ["critical", "shortage risk", "price and equity"]],
    ["PF-191", "Activated charcoal", "oral suspension and powder", "P5", ["critical", "preparedness"]],
    ["PF-192", "Fomepizole", "sterile injection", "P6", ["critical", "shortage risk", "preparedness"]],
    ["PF-193", "Hydroxocobalamin", "sterile injection kit", "P6", ["critical", "shortage risk", "preparedness"]],
    ["PF-194", "Sodium nitrite-sodium thiosulfate", "co-packaged sterile injection", "P6", ["critical", "shortage risk", "preparedness"]],
    ["PF-195", "Pralidoxime", "sterile injection and autoinjector", "P7", ["critical", "shortage risk", "preparedness"]],
    ["PF-196", "Atropine-pralidoxime autoinjector", "dual-chamber autoinjector", "P7", ["critical", "shortage risk", "preparedness"]],
    ["PF-197", "Potassium iodide", "oral solid and liquid", "P5", ["critical", "maternal and child", "preparedness"]],
    ["PF-198", "Methylene blue", "sterile injection", "P6", ["critical", "shortage risk", "preparedness"]],
    ["PF-199", "Digoxin immune Fab", "sterile biologic injection", "P8", ["critical", "shortage risk", "preparedness"]],
    ["PF-200", "Calcium and zinc DTPA", "sterile injection", "P6", ["critical", "shortage risk", "preparedness"]]
  ];

  var PHASE_META = {
    P5: "Phase 5 · Year 7",
    P6: "Phase 6 · Year 8",
    P7: "Phase 7 · Year 10",
    P8: "Phase 8 · Year 12"
  };
  var ALL_DRUG_SPEND_2024 = 717.9;

  function calcSavings(share, reduction) {
    return ALL_DRUG_SPEND_2024 * share / 100 * reduction / 100;
  }

  NHA.MEDICATIONS = {
    families: FAMILIES,
    allDrugSpend2024: ALL_DRUG_SPEND_2024,
    calcSavings: calcSavings
  };

  NHA.SELFTESTS = NHA.SELFTESTS || [];
  NHA.SELFTESTS.push({
    name: "Medication portfolio contains 200 unique sequential families",
    run: function () {
      var seen = {};
      return FAMILIES.length === 200 && FAMILIES.every(function (family, i) {
        var expected = "PF-" + String(i + 1).padStart(3, "0");
        if (family[0] !== expected || seen[family[0]]) return false;
        seen[family[0]] = true;
        return true;
      });
    }
  });
  NHA.SELFTESTS.push({
    name: "Medication qualification schedule and savings attribution reconcile",
    run: function () {
      var counts = { P5: 0, P6: 0, P7: 0, P8: 0 };
      FAMILIES.forEach(function (family) { counts[family[3]] += 1; });
      return counts.P5 === 61 && counts.P6 === 116 &&
        counts.P7 === 11 && counts.P8 === 12 &&
        Math.abs(calcSavings(5, 25) - 8.97375) < 0.001 &&
        Math.abs(calcSavings(15, 40) - 43.074) < 0.001 &&
        Math.abs(calcSavings(25, 55) - 98.71125) < 0.001;
    }
  });

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function money(value) {
    return "$" + (value >= 100 ? value.toFixed(0) : value.toFixed(1)) + "B";
  }

  function renderPortfolio() {
    var host = document.getElementById("medications-family-list");
    var queryNode = document.getElementById("medications-family-search");
    var phaseNode = document.getElementById("medications-phase-filter");
    var reasonNode = document.getElementById("medications-reason-filter");
    var countNode = document.getElementById("medications-family-count");
    if (!host || !queryNode || !phaseNode || !reasonNode || !countNode) return;

    var query = queryNode.value.trim().toLowerCase();
    var phase = phaseNode.value;
    var reason = reasonNode.value;
    var matches = FAMILIES.filter(function (family) {
      var searchable = (family[1] + " " + family[2] + " " + family[4].join(" ")).toLowerCase();
      return (!query || searchable.indexOf(query) >= 0) &&
        (!phase || family[3] === phase) &&
        (!reason || family[4].indexOf(reason) >= 0);
    });

    host.textContent = "";
    countNode.textContent = matches.length + " of 200 product families";
    if (!matches.length) {
      host.appendChild(element("p", "medications-no-results",
        "No product family matches these filters."));
      return;
    }

    matches.forEach(function (family) {
      var card = element("article", "medications-family");
      var head = element("div", "medications-family-head");
      head.appendChild(element("h3", "", family[1]));
      head.appendChild(element("span", "medications-phase-chip", PHASE_META[family[3]]));
      card.appendChild(head);
      card.appendChild(element("p", "medications-family-form", family[2]));
      var tags = element("div", "medications-family-tags");
      family[4].forEach(function (tag) {
        tags.appendChild(element("span", "", tag));
      });
      card.appendChild(tags);
      host.appendChild(card);
    });
  }

  function renderSavings() {
    var share = document.getElementById("medications-share");
    var reduction = document.getElementById("medications-reduction");
    if (!share || !reduction) return;
    var shareValue = Number(share.value);
    var reductionValue = Number(reduction.value);
    var pmc = calcSavings(shareValue, reductionValue);
    var wholePriceLever = ALL_DRUG_SPEND_2024 * reductionValue / 100;
    var purchasing = wholePriceLever - pmc;

    document.getElementById("medications-share-value").textContent =
      shareValue.toFixed(0) + "%";
    document.getElementById("medications-reduction-value").textContent =
      reductionValue.toFixed(0) + "%";
    document.getElementById("medications-pmc-savings").textContent = money(pmc);
    document.getElementById("medications-pmc-savings-copy").textContent =
      money(pmc);
    document.getElementById("medications-purchasing-savings").textContent =
      money(purchasing);
    document.getElementById("medications-total-drug-savings").textContent =
      money(wholePriceLever);
    document.getElementById("medications-savings-formula").textContent =
      "$717.9B × " + shareValue.toFixed(0) + "% × " +
      reductionValue.toFixed(0) + "% = " + money(pmc) + " per year";
    document.getElementById("medications-pmc-share-bar").style.width =
      shareValue + "%";
  }

  function init() {
    var query = document.getElementById("medications-family-search");
    var phase = document.getElementById("medications-phase-filter");
    var reason = document.getElementById("medications-reason-filter");
    var share = document.getElementById("medications-share");
    var reduction = document.getElementById("medications-reduction");
    if (query) query.addEventListener("input", renderPortfolio);
    if (phase) phase.addEventListener("change", renderPortfolio);
    if (reason) reason.addEventListener("change", renderPortfolio);
    if (share) share.addEventListener("input", renderSavings);
    if (reduction) reduction.addEventListener("input", renderSavings);
    renderPortfolio();
    renderSavings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
