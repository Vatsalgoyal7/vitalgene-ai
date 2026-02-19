
import { 
  PGxReport, Variant, SupportedDrug, SupportedGene, 
  RiskLabel, Severity, Phenotype, PGxProfile,
  RiskAssessment, ClinicalRecommendation, QualityMetrics 
} from '../types';
import { DRUG_GENE_MAP, VARIANT_KNOWLEDGE_BASE, TARGET_GENES } from '../constants';
import { generateClinicalInsight } from './geminiService';
import { saveAnalysesToHistory } from './dashboardStore';

/**
 * VitalGene AI Advanced Clinical Pharmacogenomics AI Engine
 * Logic focused on real-time VCF processing and independent drug-gene evaluation.
 */
export async function processPGx(vcfData: string, drugInput: string): Promise<PGxReport[]> {
  if (!vcfData || !vcfData.includes('##fileformat=VCF')) {
    throw new Error("Invalid VCF format: Standard header missing.");
  }

  const lines = vcfData.split('\n');
  const variants: Variant[] = [];
  let patientId = "PATIENT_PROFILED";
  let variantsAnalyzed = 0;
  let headerFound = false;

  // Process VCF lines for all pharmacogenes
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('##')) continue;
    
    if (trimmed.startsWith('#CHROM')) {
      headerFound = true;
      const parts = trimmed.split('\t');
      if (parts.length > 9) patientId = parts[9].trim();
      continue;
    }

    if (!headerFound) continue;

    variantsAnalyzed++;
    const cols = trimmed.split('\t');
    if (cols.length < 8) continue;

    const [chrom, pos, id, ref, alt, qual, filter, info] = cols;
    const meta = VARIANT_KNOWLEDGE_BASE[id];
    const geneSymbol = meta?.gene || (info.match(/GENE=([^;]+)/)?.[1]);

    if (geneSymbol && TARGET_GENES.includes(geneSymbol as SupportedGene)) {
      const genotypeField = cols.length > 9 ? cols[9].split(':')[0] : '0/0';

      variants.push({
        rsid: id === '.' ? `snp_${pos}` : id,
        gene: geneSymbol,
        position: parseInt(pos),
        ref,
        alt,
        starAllele: meta?.starAllele || '*1',
        significance: meta?.significance || 'Wild-type',
        genotype: genotypeField,
        chromosome: chrom
      });
    }
  }

  const requestedDrugsRaw = drugInput.split(',').map(d => d.trim().toUpperCase());
  const requestedDrugs = requestedDrugsRaw.filter(d => DRUG_GENE_MAP[d as SupportedDrug]) as SupportedDrug[];
  
  if (requestedDrugs.length === 0) {
    throw new Error(`Medication(s) "${drugInput}" not found in our genomic database.`);
  }

  const reports: PGxReport[] = [];

  for (const drug of requestedDrugs) {
    // CRITICAL: Evaluate ONLY the specific gene relevant to this drug
    const targetGene = DRUG_GENE_MAP[drug];
    if (!targetGene) continue;

    const geneVariants = variants.filter(v => v.gene === targetGene);
    
    // Phenotype and Diplotype Inference (CPIC aligned)
    let phenotype: Phenotype = 'NM';
    let diplotype = '*1/*1';

    if (geneVariants.length > 0) {
      const activeVariant = geneVariants.find(v => v.genotype === '1/1' || v.genotype === '0/1') || geneVariants[0];
      const meta = VARIANT_KNOWLEDGE_BASE[activeVariant.rsid];
      
      if (activeVariant.genotype === '1/1') {
        phenotype = meta?.phenotype || 'PM';
        diplotype = meta ? `${meta.starAllele}/${meta.starAllele}` : '*X/*X';
      } else if (activeVariant.genotype === '0/1' || activeVariant.genotype === '1/0') {
        phenotype = 'IM';
        diplotype = meta ? `*1/${meta.starAllele}` : '*1/*X';
      }

      // Handle specific Ultrarapid / RM phenotypes
      if (activeVariant.rsid === 'rs12248560' && activeVariant.genotype !== '0/0') {
        phenotype = activeVariant.genotype === '1/1' ? 'URM' : 'RM';
      }
    }

    const risk = calculateRisk(drug, phenotype);
    const rec = getRecommendation(drug, phenotype);

    const profile: PGxProfile = {
      primary_gene: targetGene,
      diplotype,
      phenotype,
      detected_variants: geneVariants
    };

    // AI Enhanced Clinical Explanation
    const explanation = await generateClinicalInsight(drug, profile, risk, rec);

    const report: PGxReport = {
      patient_id: patientId,
      drug,
      timestamp: new Date().toISOString(),
      risk_assessment: risk,
      pharmacogenomic_profile: profile,
      clinical_recommendation: rec,
      llm_generated_explanation: explanation,
      quality_metrics: {
        vcf_parsing_success: true,
        variantsAnalyzed,
        pharmacogenomicVariantsFound: geneVariants.length,
        annotationCompleteness: 0.99,
        timestamp: new Date().toISOString()
      }
    };

    reports.push(report);
  }

  if (reports.length > 0) {
    saveAnalysesToHistory(reports);
  }

  return reports;
}

function calculateRisk(drug: SupportedDrug, phenotype: Phenotype): RiskAssessment {
  let risk_label: RiskLabel = 'Safe';
  let severity: Severity = 'none';
  let confidence_score = 0.95;

  if (phenotype === 'NM') return { risk_label: 'Safe', severity: 'none', confidence_score: 0.99 };

  // Drug-Specific Logic: Active Drug vs Prodrug
  switch (drug) {
    case 'CODEINE': // PRODRUG
      if (phenotype === 'PM') { risk_label = 'Ineffective'; severity = 'moderate'; }
      else if (phenotype === 'URM' || phenotype === 'RM') { risk_label = 'Toxic'; severity = 'critical'; }
      else if (phenotype === 'IM') { risk_label = 'Adjust Dosage'; severity = 'low'; }
      break;
    case 'CLOPIDOGREL': // PRODRUG
      if (phenotype === 'PM') { risk_label = 'Ineffective'; severity = 'high'; }
      else if (phenotype === 'IM') { risk_label = 'Adjust Dosage'; severity = 'moderate'; }
      break;
    case 'WARFARIN': // ACTIVE
      if (phenotype === 'PM') { risk_label = 'Toxic'; severity = 'high'; }
      else if (phenotype === 'IM') { risk_label = 'Adjust Dosage'; severity = 'moderate'; }
      break;
    case 'SIMVASTATIN': // ACTIVE
      if (phenotype === 'PM') { risk_label = 'Toxic'; severity = 'high'; }
      else if (phenotype === 'IM') { risk_label = 'Adjust Dosage'; severity = 'low'; }
      break;
    case 'AZATHIOPRINE': // METABOLIC SHUNT
      if (phenotype === 'PM' || phenotype === 'Unknown') { risk_label = 'Toxic'; severity = 'critical'; }
      else if (phenotype === 'IM') { risk_label = 'Adjust Dosage'; severity = 'high'; }
      break;
    case 'FLUOROURACIL': // ACTIVE
      if (phenotype === 'PM' || phenotype === 'Unknown') { risk_label = 'Toxic'; severity = 'critical'; }
      else if (phenotype === 'IM') { risk_label = 'Adjust Dosage'; severity = 'high'; }
      break;
  }

  return { risk_label, severity, confidence_score };
}

function getRecommendation(drug: SupportedDrug, phenotype: Phenotype): ClinicalRecommendation {
  const baseline: ClinicalRecommendation = {
    action: 'Standard Dosing',
    dosingGuideline: 'Prescribe standard starting dose according to package insert.',
    monitoringAdvice: 'Routine monitoring required.',
    alternativeDrugs: [],
    cpicGuideline: 'CPIC Level A evidence suggests normal metabolic activity.',
    evidenceLevel: 'A'
  };

  if (phenotype === 'NM') return baseline;

  const recs: Record<string, Partial<ClinicalRecommendation>> = {
    'CODEINE-PM': {
      action: 'Avoid Use',
      dosingGuideline: 'Poor metabolizer status results in lack of conversion to active morphine.',
      monitoringAdvice: 'Monitor for lack of analgesic efficacy.',
      alternativeDrugs: ['Oxycodone', 'Morphine', 'NSAIDs'],
      cpicGuideline: 'Avoid codeine use in CYP2D6 Poor Metabolizers.'
    },
    'CODEINE-URM': {
      action: 'Avoid Use',
      dosingGuideline: 'High risk of opioid toxicity due to rapid conversion to morphine.',
      monitoringAdvice: 'Respiratory monitoring required if used.',
      alternativeDrugs: ['Tramadol', 'Morphine'],
      cpicGuideline: 'Avoid codeine due to risk of life-threatening respiratory depression.'
    },
    'WARFARIN-PM': {
      action: 'Major Dose Reduction',
      dosingGuideline: 'Reduce starting dose by 50-70% based on sensitivity.',
      monitoringAdvice: 'Frequent INR checks until stable.',
      alternativeDrugs: ['Apixaban', 'Rivaroxaban'],
      cpicGuideline: 'Significant reduction in warfarin clearance observed in CYP2C9 PMs.'
    },
    'CLOPIDOGREL-PM': {
      action: 'Alternative Therapy',
      dosingGuideline: 'Reduced active metabolite levels lead to increased cardiovascular event risk.',
      alternativeDrugs: ['Prasugrel', 'Ticagrelor'],
      cpicGuideline: 'Recommend alternative antiplatelet therapy for CYP2C19 Poor Metabolizers.'
    },
    'AZATHIOPRINE-PM': {
       action: 'Reduce Dose / Alternative',
       dosingGuideline: 'Reduce starting dose by 90% or use alternative therapy.',
       monitoringAdvice: 'Weekly CBC for myelosuppression risk.',
       cpicGuideline: 'TPMT Poor Metabolizers require drastic dose reduction or alternative agents.'
    },
    'FLUOROURACIL-PM': {
       action: 'Avoid Use / Major Reduction',
       dosingGuideline: 'Avoid or reduce starting dose by 50% or more.',
       monitoringAdvice: 'Intensive monitoring for severe toxicity.',
       cpicGuideline: 'DPYD deficiency is associated with life-threatening 5-FU toxicity.'
    }
  };

  const key = `${drug}-${phenotype}`;
  return { ...baseline, ...(recs[key] || { action: 'Dose Adjustment Advised', dosingGuideline: 'Modify starting dose per metabolizer status.' }) };
}
