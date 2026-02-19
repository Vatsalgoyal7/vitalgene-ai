
export type RiskLabel = 'Safe' | 'Adjust Dosage' | 'Toxic' | 'Ineffective' | 'Unknown';
export type Severity = 'none' | 'low' | 'moderate' | 'high' | 'critical';
export type Phenotype = 'PM' | 'IM' | 'NM' | 'RM' | 'URM' | 'Unknown';

export interface Variant {
  rsid: string;
  gene: string;
  position: number;
  ref: string;
  alt: string;
  starAllele: string;
  significance: string;
  genotype?: string;
  chromosome?: string;
}

export interface PGxProfile {
  primary_gene: string;
  diplotype: string;
  phenotype: Phenotype;
  detected_variants: Variant[];
}

export interface RiskAssessment {
  risk_label: RiskLabel;
  confidence_score: number;
  severity: Severity;
}

export interface ClinicalRecommendation {
  action: string;
  dosingGuideline: string;
  monitoringAdvice: string;
  alternativeDrugs: string[];
  cpicGuideline: string;
  evidenceLevel: string;
}

export interface LLMExplanation {
  summary: string;
  mechanism: string;
  clinicalImpact: string;
  variantDetails: string;
  references: string[];
}

export interface QualityMetrics {
  vcf_parsing_success: boolean;
  variantsAnalyzed: number;
  pharmacogenomicVariantsFound: number;
  annotationCompleteness: number;
  timestamp: string;
}

export interface PGxReport {
  patient_id: string;
  drug: string;
  timestamp: string;
  risk_assessment: RiskAssessment;
  pharmacogenomic_profile: PGxProfile;
  clinical_recommendation: ClinicalRecommendation;
  llm_generated_explanation: LLMExplanation;
  quality_metrics: QualityMetrics;
}

export type SupportedDrug = 'CODEINE' | 'WARFARIN' | 'CLOPIDOGREL' | 'SIMVASTATIN' | 'AZATHIOPRINE' | 'FLUOROURACIL';
export type SupportedGene = 'CYP2D6' | 'CYP2C19' | 'CYP2C9' | 'SLCO1B1' | 'TPMT' | 'DPYD';
