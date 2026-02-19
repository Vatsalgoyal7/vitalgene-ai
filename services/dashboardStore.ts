import { PGxReport } from '../types';

const STORAGE_KEY = 'pharma_guard_analysis_history';

export const saveAnalysesToHistory = (reports: PGxReport[]) => {
  const existing = getAnalysisHistory();
  const updated = [...reports, ...existing];
  // Limit to last 100 for performance
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
};

export const getAnalysisHistory = (): PGxReport[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getDashboardStats = () => {
  const history = getAnalysisHistory();
  
  const highRiskCount = history.filter(r => 
    r.risk_assessment.severity === 'high' || r.risk_assessment.severity === 'critical'
  ).length;

  const drugFreq: Record<string, number> = {};
  history.forEach(r => {
    drugFreq[r.drug] = (drugFreq[r.drug] || 0) + 1;
  });

  const topDrug = Object.entries(drugFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const riskDistribution = {
    Safe: history.filter(r => r.risk_assessment.risk_label === 'Safe').length,
    'Adjust Dosage': history.filter(r => r.risk_assessment.risk_label === 'Adjust Dosage').length,
    Toxic: history.filter(r => r.risk_assessment.risk_label === 'Toxic').length,
    Ineffective: history.filter(r => r.risk_assessment.risk_label === 'Ineffective').length,
    Unknown: history.filter(r => r.risk_assessment.risk_label === 'Unknown').length,
  };

  return {
    totalAnalyses: history.length,
    highRiskCount,
    topDrug,
    lastAnalysis: history[0]?.timestamp || null,
    riskDistribution,
    recentAnalyses: history.slice(0, 10)
  };
};
