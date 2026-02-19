
import { SupportedGene, Phenotype, SupportedDrug } from './types';

export const TARGET_GENES: SupportedGene[] = ['CYP2D6', 'CYP2C19', 'CYP2C9', 'SLCO1B1', 'TPMT', 'DPYD'];
export const SUPPORTED_DRUGS: SupportedDrug[] = ['CODEINE', 'WARFARIN', 'CLOPIDOGREL', 'SIMVASTATIN', 'AZATHIOPRINE', 'FLUOROURACIL'];

export interface VariantMeta {
  gene: SupportedGene;
  starAllele: string;
  phenotype: Phenotype;
  significance: string;
}

export const VARIANT_KNOWLEDGE_BASE: Record<string, VariantMeta> = {
  'rs3892097': { gene: 'CYP2D6', starAllele: '*4', phenotype: 'PM', significance: 'No function' },
  'rs3758581': { gene: 'CYP2D6', starAllele: '*10', phenotype: 'IM', significance: 'Decreased function' },
  'rs4244285': { gene: 'CYP2C19', starAllele: '*2', phenotype: 'PM', significance: 'No function' },
  'rs12248560': { gene: 'CYP2C19', starAllele: '*17', phenotype: 'RM', significance: 'Increased function' },
  'rs1057910': { gene: 'CYP2C9', starAllele: '*3', phenotype: 'PM', significance: 'No function' },
  'rs1799853': { gene: 'CYP2C9', starAllele: '*2', phenotype: 'IM', significance: 'Decreased function' },
  'rs4149056': { gene: 'SLCO1B1', starAllele: '*5', phenotype: 'PM', significance: 'Decreased function (Myopathy Risk)' },
  'rs1801131': { gene: 'TPMT', starAllele: '*3C', phenotype: 'IM', significance: 'No function' },
  'rs1142345': { gene: 'TPMT', starAllele: '*3A', phenotype: 'PM', significance: 'No function' },
  'rs3918290': { gene: 'DPYD', starAllele: '*2A', phenotype: 'PM', significance: 'No function (Life-threatening toxicity)' },
};

export const DRUG_GENE_MAP: Record<SupportedDrug, SupportedGene> = {
  CODEINE: 'CYP2D6',
  WARFARIN: 'CYP2C9',
  CLOPIDOGREL: 'CYP2C19',
  SIMVASTATIN: 'SLCO1B1',
  AZATHIOPRINE: 'TPMT',
  FLUOROURACIL: 'DPYD',
};

export const MEDICATION_METADATA: Record<SupportedDrug, { gene: string, riskType: string }> = {
  CODEINE: { gene: 'CYP2D6', riskType: 'Opioid toxicity / ineffectiveness' },
  WARFARIN: { gene: 'CYP2C9', riskType: 'Bleeding / thrombosis' },
  CLOPIDOGREL: { gene: 'CYP2C19', riskType: 'Cardiovascular events' },
  SIMVASTATIN: { gene: 'SLCO1B1', riskType: 'Myopathy' },
  AZATHIOPRINE: { gene: 'TPMT', riskType: 'Severe myelosuppression' },
  FLUOROURACIL: { gene: 'DPYD', riskType: 'Life-threatening toxicity' },
};

const VCF_HEADER = `##fileformat=VCFv4.2
##FILTER=<ID=PASS,Description="All filters passed">
##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene Symbol">
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	PATIENT_ID`;

export const SAMPLES: Record<string, { vcf: string; drugs: string }> = {
  'Normal Metabolizer': {
    vcf: `${VCF_HEADER.replace('PATIENT_ID', 'PATIENT_NM')}\nchr1	123456	.	A	G	100	PASS	GENE=NONE	GT	0/0`,
    drugs: 'CODEINE, WARFARIN, SIMVASTATIN'
  },
  'CYP2D6 PM (Codeine)': {
    vcf: `${VCF_HEADER.replace('PATIENT_ID', 'PATIENT_D6_PM')}\nchr22	42123456	rs3892097	C	T	100	PASS	GENE=CYP2D6	GT	1/1`,
    drugs: 'CODEINE'
  },
  'CYP2C19 PM (Clopidogrel)': {
    vcf: `${VCF_HEADER.replace('PATIENT_ID', 'PATIENT_C19_PM')}\nchr10	94942290	rs4244285	G	A	100	PASS	GENE=CYP2C19	GT	1/1`,
    drugs: 'CLOPIDOGREL'
  },
  'Warfarin Sensitive (CYP2C9)': {
    vcf: `${VCF_HEADER.replace('PATIENT_ID', 'PATIENT_C9_PM')}\nchr10	94942290	rs1057910	A	C	100	PASS	GENE=CYP2C9	GT	1/1`,
    drugs: 'WARFARIN'
  },
  'Simvastatin Risk (SLCO1B1)': {
    vcf: `${VCF_HEADER.replace('PATIENT_ID', 'PATIENT_SLCO_PM')}\nchr12	21345678	rs4149056	T	C	100	PASS	GENE=SLCO1B1	GT	1/1`,
    drugs: 'SIMVASTATIN'
  },
  'Azathioprine Toxicity (TPMT)': {
    vcf: `${VCF_HEADER.replace('PATIENT_ID', 'PATIENT_TPMT_PM')}\nchr6	18123456	rs1142345	G	A	100	PASS	GENE=TPMT	GT	1/1`,
    drugs: 'AZATHIOPRINE'
  },
  'Fluorouracil Toxicity (DPYD)': {
    vcf: `${VCF_HEADER.replace('PATIENT_ID', 'PATIENT_DPYD_PM')}\nchr1	9754321	rs3918290	G	A	100	PASS	GENE=DPYD	GT	1/1`,
    drugs: 'FLUOROURACIL'
  }
};
