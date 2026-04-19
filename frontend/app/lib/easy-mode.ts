/**
 * Scientific term simplification map for "Easy Mode".
 * Format: [Original Term]: [Simple Term]
 */
export const EASY_MODE_MAP: Record<string, string> = {
  // General Metrics & UI Labels
  "Binding Affinity": "Sticking Power",
  "Docking Score": "Fitting Score",
  "Affinity": "Grip",
  "Selectivity": "Target Precision",
  "Pathogenicity": "Disease Risk",
  "Synthesizability": "Ease of Making",
  "Novelty": "Originality",
  "Pipeline Progress": "Search Progress",
  "Top Leads": "Best Candidates",
  "Clinical Trials": "Patient Studies",
  "Evolution Tree": "Molecules Family Tree",
  "Knowledge Graph": "Science Map",
  "Pocket Geometry": "Keyhole Shape",
  "Molecular Dynamics": "Movement Simulation",
  "Docking": "Fitting Test",
  "Literature": "Scientific Papers",
  "Reasoning": "AI Logic",
  "Export": "Download Report",
  "Platform": "Lab Workspace",
  "Archive": "Saved Findings",
  "Methodology": "How It Works",
  "Research": "Discovery Hub",
  "Discoveries": "Saved Library",
  "Starting Molecule": "Base Molecule",
  "Variation": "Change",

  // Technical Units/Methods
  "kcal/mol": "Energy Units",
  "Å": "Units",
  "SMILES": "Chemical Code",
  "ADMET": "Safety Profile",
  "MM-GBSA": "Binding Stability",
  "RMSD": "Stability Score",
  "pLDDT": "Structure Quality",
  "ESM-1v": "AI Prediction",
  "MD Stability": "Stability Test",
  "Synthesis": "Recipe",
  "SA Score": "Ease of Making",
  "SA": "Making Difficulty",
  "Molecular Dynamics Validation": "Stability Test",
  "RMSD Trajectory": "Movement History",
  "Mean RMSD": "Stability Score",
  "MM-GBSA ΔG": "Grip Score",
  "Volume Change": "Size Change",
  "Pocket Geometry Analysis": "Keyhole Profile",
  "Synthesis Planning": "Recipe Creation",
  
  // Specific ADMET categories
  "Absorption": "Blood Intake",
  "Distribution": "Target Reaching",
  "Metabolism": "Body Breakdown",
  "Excretion": "Safe Removal",
  "Toxicity": "Harm Potential",
  "Weight": "Size",
  "Fattiness": "Oiliness",
  "H-Donors": "H-Donors",
  "H-Acceptors": "H-Acceptors",
  "Blood Prep": "Body Survival",
  "Standard Rule": "Safety Test",
  
  // Pipeline Stages
  "Mutation Parsing": "Reading Mutation",
  "Structure Prep": "Protein 3D Model",
  "Variant Effect": "Damage Check",
  "Pocket Detection": "Finding Keyhole",
  "Molecule Generation": "Designing Seeds",
  "Lead Optimization": "Perfecting Leads",
  "MD Validation": "Final Stability Test",
  
  // Evolution Tree Methods
  "scaffold hop": "Skeleton Change",
  "bioisostere": "Smart Swap",
  "fragment link": "Connecting Parts",
  "ring expand": "Ring Growth",
  "ring contract": "Ring Shrink",
  "substituent": "Side Group Change",
  "Improved": "Better Binding",
  "Regressed": "Worse Binding",
  
  // Geometry
  "Hydrophobicity": "Water Repellency",
  "Polarity": "Charge Balance",
  "Solvent Accessibility": "Surface Exposure"
};

/**
 * Simplifies a term if Easy Mode is active.
 * If no simplified term exists, returns the original.
 */
export function simplifyTerm(term: string, isEasyMode: boolean): string {
  if (!isEasyMode) return term;
  
  // Try exact match
  if (EASY_MODE_MAP[term]) return EASY_MODE_MAP[term];
  
  // Try case-insensitive math if exact fails
  const entry = Object.entries(EASY_MODE_MAP).find(
    ([k]) => k.toLowerCase() === term.toLowerCase()
  );
  if (entry) return entry[1];

  return term;
}

/**
 * Hook-ready wrapper for multiple terms in a block of text.
 * Very simple replacement for common keywords.
 */
export function simplifyText(text: string, isEasyMode: boolean): string {
  if (!text || !isEasyMode) return text;
  
  let result = text;
  Object.entries(EASY_MODE_MAP).forEach(([original, simple]) => {
    // Escape regex chars if any (though usually scientific terms are clean)
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    result = result.replace(regex, simple);
  });
  
  return result;
}
