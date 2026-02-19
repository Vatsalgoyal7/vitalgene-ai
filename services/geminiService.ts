
import { GoogleGenAI, Type } from "@google/genai";
import { PGxProfile, LLMExplanation, RiskAssessment, ClinicalRecommendation } from "../types";

export async function generateClinicalInsight(
  drug: string,
  profile: PGxProfile,
  risk: RiskAssessment,
  recommendation: ClinicalRecommendation
): Promise<LLMExplanation> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `You are a VitalGene AI Advanced Clinical Pharmacogenomics AI Engine. 
  Your role is to generate drug-specific pharmacogenomic risk assessments based on genetic data.
  Follow CPIC guidelines strictly. Cite specific rsIDs. Explain molecular mechanisms of enzyme activity change.
  Output JSON format exactly matching the requested schema.`;

  const prompt = `
    Analyze risk for medication: ${drug}
    
    PATIENT GENOMIC DATA:
    - Primary Gene: ${profile.primary_gene}
    - Phenotype: ${profile.phenotype}
    - Diplotype: ${profile.diplotype}
    - Detected Variants: ${profile.detected_variants.map(v => `${v.rsid} (Genotype: ${v.genotype})`).join(', ') || 'No actionable variants found (Wild-type)'}
    
    CLINICAL PARAMETERS:
    - Risk Label: ${risk.risk_label}
    - Severity: ${risk.severity}
    - Action: ${recommendation.action}
    - Dosing Guideline: ${recommendation.dosingGuideline}
    - Evidence Level: ${recommendation.evidenceLevel}

    TASKS:
    1. Generate a professional summary including the phenotype and dosing rationale.
    2. Explain the molecular mechanism (enzyme activity change) citing the rsIDs provided.
    3. Detail the drug metabolism impact and clinical consequence.
    4. Provide specific notes on the cited variants.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            mechanism: { type: Type.STRING },
            clinicalImpact: { type: Type.STRING },
            variantDetails: { type: Type.STRING },
            references: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
          },
          required: ["summary", "mechanism", "clinicalImpact", "variantDetails"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result as LLMExplanation;
  } catch (error) {
    console.error("Gemini rationale synthesis failed:", error);
    return {
      summary: `Guidance for ${drug} based on ${profile.primary_gene} ${profile.phenotype} status. ${recommendation.dosingGuideline}`,
      mechanism: `Variation in ${profile.primary_gene} affects the conversion or clearance of ${drug}, altering therapeutic plasma levels.`,
      clinicalImpact: `Patient is at ${risk.risk_label} risk for adverse therapy outcomes or therapeutic failure.`,
      variantDetails: `Detected diplotype ${profile.diplotype} indicates modified enzymatic function.`,
      references: ["CPIC Pharmacogenetic Guidelines", "PharmGKB Database"]
    };
  }
}
