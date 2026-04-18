export interface MutationContext {
  gene: string;
  mutation: string;
  hgvs: string | null;
  disease_context: string;
  is_mutation: boolean;
  is_disease: boolean;
}

export interface AnalysisPlan {
  run_literature: boolean;
  run_target: boolean;
  run_structure: boolean;
  run_compound: boolean;
  run_pocket_detection: boolean;
  run_molecule_generation: boolean;
  run_docking: boolean;
  run_selectivity: boolean;
  run_admet: boolean;
  run_lead_optimization: boolean;
  run_resistance: boolean;
  run_similarity: boolean;
  run_synergy: boolean;
  run_clinical_trials: boolean;
  run_report: boolean;
}

export interface LiteratureItem {
  pubmed_id: string;
  title: string;
  journal: string;
  publication_date: string;
}

export interface ProteinItem {
  accession: string;
  protein_name: string;
  gene_names: string[];
  organism: string;
  sequence: string;
}

export interface StructureItem {
  pdb_id: string;
  title: string;
  experimental_methods: string;
  resolution: number | null;
  pdb_path: string | null;
}

export interface KnownCompound {
  name: string;
  molecular_formula: string;
  canonical_smiles: string;
  molecular_weight: number | null;
}

export interface DockingResult {
  smiles: string;
  compound_name: string;
  structure: string;
  binding_energy: number;
  confidence: "Very Strong" | "Strong" | "Moderate" | "Weak";
  method: string;
  pose_id?: string | null;
  pose_format?: string | null;
}

export interface SelectivityResult {
  smiles: string;
  target_affinity: number;
  off_target_affinity: number;
  off_target_pdb: string;
  off_target_name: string;
  selectivity_ratio: number;
  selective: boolean;
  selectivity_label: "High" | "Moderate" | "Low" | "Dangerous";
}

export interface ADMETProfile {
  smiles: string;
  lipinski_pass: boolean;
  mw?: number;
  hbd?: number;
  hba?: number;
  logp?: number;
  rotb?: number;
  violations?: number;
  tox21_pass: boolean;
  solubility: string;
  bbb: boolean;
  bioavailability: number;
  pains_flag: boolean;
  pains_match: string;
}

export interface ToxicophoreHighlight {
  smiles: string;
  highlight_b64: string;
  flagged_atoms: number[];
  pains_match_name: string;
  reason: string;
}

export interface SimilarCompound {
  chembl_id: string;
  smiles: string;
  similarity?: number;
  clinical_phase?: string;
  target?: string;
}

export interface ResistanceFlag {
  drug_name: string;
  mutation: string;
  flag_type: string;
  reason: string;
}

export interface SynthesisScore {
  smiles: string;
  sa_score: number;
  sa_category?: string;
  estimated_steps?: number;
  cost_estimate?: string;
}

export interface SynthesisRoute {
  smiles: string;
  num_steps: number;
  sa_score: number;
  sa_category?: string;
  estimated_steps?: number;
  cost_estimate?: string;
  reactions?: Record<string, unknown>[];
  synthetic_route_summary?: string;
  method?: string;
}

export interface MDResult {
  smiles: string;
  rmsd_mean: number;
  rmsd_trajectory: number[];
  stability_label: "STABLE" | "BORDERLINE" | "UNSTABLE";
  mmgbsa_dg: number;
  rmsd_stable: boolean;
}

export interface BindingPocket {
  center_x: number;
  center_y: number;
  center_z: number;
  size_x: number;
  size_y: number;
  size_z: number;
  score?: number;
  method?: string;
}

export interface PocketDelta {
  volume_delta?: number;
  hydrophobicity_score_delta?: number;
  polarity_score_delta?: number;
  charge_score_delta?: number;
  pocket_reshaped?: boolean;
}

export interface EvolutionNode {
  id: string;
  smiles: string;
  score: number;
  generation: number;
  method: string;
  admet_pass: boolean;
}

export interface EvolutionEdge {
  from_id: string;
  to_id: string;
  operation: string;
  delta_score: number;
}

export interface EvolutionTree {
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
}

export interface ClinicalTrial {
  nct_id: string;
  title: string;
  phase: string;
  status: string;
  condition: string;
  interventions: string[];
  url: string;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  color: string;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  relation: string;
  binding_energy?: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface RankedLead {
  rank: number;
  smiles: string;
  compound_name: string;
  structure?: string;
  pose_id?: string | null;
  pose_format?: string | null;
  docking_score: number | null;
  confidence: string;
  admet_pass: boolean;
  admet_flags: string[];
  selectivity_ratio: number;
  selective: boolean;
  selectivity_label: "High" | "Moderate" | "Low" | "Dangerous";
  toxicophore_highlight_b64: string;
  toxicophore_reason: string;
  optimization_history: Array<Record<string, unknown>>;
  similar_to: string[];
  resistance_flag: boolean;
  mol_image_b64: string;
  clinical_trials_count: number;
}

export interface PipelineMetrics {
  literature_count: number;
  proteins_found: number;
  structures_found: number;
  molecules_generated: number;
  molecules_docked: number;
  admet_passing: number;
  leads_optimized: number;
  selective_leads: number;
  clinical_trials_found: number;
  pocket_detection_method: string;
  docking_mode: string;
  llm_provider: string;
  langsmith_run_id: string | null;
  execution_time_ms: number;
}

export interface FinalReport {
  ranked_leads: RankedLead[];
  summary: string;
  resistance_forecast: string | null;
  clinical_trials: ClinicalTrial[];
  evolution_tree: EvolutionTree | null;
  metrics: PipelineMetrics;
  export_ready: boolean;
}

export interface PipelineState {
  query: string;
  session_id: string;
  mode: "full" | "lite";
  status?: string | null;
  cancelled?: boolean;
  mutation_context: MutationContext | null;
  analysis_plan: AnalysisPlan | null;
  literature: LiteratureItem[];
  proteins: ProteinItem[];
  structures: StructureItem[];
  pdb_content?: string | null;
  binding_pocket?: BindingPocket | null;
  pocket_detection_method?: string | null;
  pocket_delta?: PocketDelta | null;
  known_compounds: KnownCompound[];
  generated_molecules?: unknown[];
  docking_results: DockingResult[];
  selectivity_results: SelectivityResult[];
  admet_profiles: ADMETProfile[];
  toxicophore_highlights: ToxicophoreHighlight[];
  optimized_leads?: unknown[];
  evolution_tree: EvolutionTree | null;
  md_results?: MDResult[];
  clinical_trials: ClinicalTrial[];
  similar_compounds?: SimilarCompound[];
  resistance_flags?: ResistanceFlag[];
  synthesis_routes?: SynthesisRoute[];
  sa_scores?: SynthesisScore[];
  synthesis_feasibility?: string | null;
  knowledge_graph: KnowledgeGraph | null;
  reasoning_trace: Record<string, string> | null;
  summary: string | null;
  final_report: FinalReport | null;
  discovery_id: string | null;
  agent_statuses: Record<string, string>;
  errors: string[];
  warnings: string[];
  execution_time_ms: number;
  langsmith_run_id: string | null;
  llm_provider_used: string;
}

export interface AgentEvent {
  event:
    | "agent_start"
    | "agent_complete"
    | "agent_error"
    | "pipeline_start"
    | "pipeline_cancelled"
    | "pipeline_complete"
    | "not_found"
    | "heartbeat";
  agent?: string;
  progress?: number;
  data?: Partial<PipelineState>;
  error?: string;
  langsmith_run_id?: string | null;
  session_id?: string;
  query?: string;
}

export interface DiscoveryRecord {
  id: string;
  session_id: string;
  query: string;
  gene: string;
  mutation: string;
  top_lead_smiles: string;
  top_lead_score: number | null;
  selectivity_ratio: number | null;
  summary: string;
  langsmith_run_id: string | null;
  created_at: string;
}

export interface ThemeTokens {
  name: string;
  colors: Record<string, string>;
}
