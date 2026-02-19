import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, ShieldCheck, FileText, ChevronDown, Download, Copy, 
  ArrowRight, Search, Activity, Stethoscope, BrainCircuit, 
  Globe, CheckCircle2, Trash2, Plus, Zap, AlertTriangle, 
  FileCode, ExternalLink, Loader2, X, ChevronRight, BarChart3, 
  Pill, Microscope, HeartPulse, LogOut, ChevronUp, Info, 
  Settings2, Database, ShieldAlert, Sparkles, Github, LayoutDashboard,
  UploadCloud, Link as LinkIcon, User, Layers, FileJson, 
  GraduationCap, ClipboardCheck, History, TrendingUp, Filter, Calendar,
  Terminal, Server, Lock, BookOpen, Mail, Scale
} from 'lucide-react';
import { processPGx } from './services/pgxEngine';
import { PGxReport, SupportedDrug, RiskLabel } from './types';
import { SUPPORTED_DRUGS, SAMPLES, MEDICATION_METADATA } from './constants';
import { getDashboardStats, clearHistory } from './services/dashboardStore';
import RiskBadge from './components/RiskBadge';

const AnalysisSteps = [
  "Mounting clinical biosensors...",
  "Sequencing VCF stream...",
  "Cross-referencing rsIDs with PharmGKB...",
  "Applying CPIC clinical algorithms...",
  "Synthesizing Gemini risk rationale...",
  "Finalizing diagnostic report..."
];

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

export default function App() {
  const [view, setView] = useState<'landing' | 'analyzer' | 'dashboard' | 'documentation' | 'privacy' | 'terms'>('landing');
  const [vcfFile, setVcfFile] = useState<File | null>(null);
  const [vcfContent, setVcfContent] = useState<string>('');
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [drugSearchTerm, setDrugSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [reports, setReports] = useState<PGxReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeReportIdx, setActiveReportIdx] = useState(0);
  const [showJsonModal, setShowJsonModal] = useState<PGxReport | null>(null);
  const [isVcfValid, setIsVcfValid] = useState<boolean | null>(null);
  
  const [expandedSections, setExpandedSections] = useState({
    profile: true,
    recommendation: true,
    rationale: true
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < AnalysisSteps.length - 1 ? prev + 1 : prev));
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { 
      addToast("File size threshold exceeded (5MB max).", "error"); 
      return; 
    }
    if (!file.name.toLowerCase().endsWith('.vcf')) { 
      addToast("Unsupported file format. Please upload a standard VCF.", "error"); 
      return; 
    }

    setVcfFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setVcfContent(content);
      const valid = content.toLowerCase().includes('fileformat=vcf') && content.includes('#CHROM');
      setIsVcfValid(valid);
      if (!valid) {
        addToast("The uploaded VCF file appears to have a malformed header.", "info");
      } else {
        addToast("VCF file loaded successfully", "success");
      }
    };
    reader.readAsText(file);
    setError(null);
  };

  const loadSample = (name: string) => {
    const sample = SAMPLES[name];
    setVcfContent(sample.vcf);
    setSelectedDrugs(sample.drugs.split(',').map(d => d.trim()));
    setVcfFile(new File([sample.vcf], `${name.toLowerCase().replace(/ /g, '_')}.vcf`, { type: 'text/plain' }));
    setIsVcfValid(true);
    setError(null);
    addToast(`Sample profile "${name}" loaded.`, "success");
  };

  const addDrug = (drug: string) => {
    if (!selectedDrugs.includes(drug)) {
      setSelectedDrugs([...selectedDrugs, drug]);
    }
    setDrugSearchTerm('');
    setIsDropdownOpen(false);
  };

  const removeDrug = (drug: string) => {
    setSelectedDrugs(selectedDrugs.filter(d => d !== drug));
  };

  const downloadJson = useCallback((report: PGxReport) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PGx_Report_${report.drug}_${report.patient_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Data report exported successfully.", "success");
  }, []);

  const handleSubmit = async () => {
    if (!vcfContent) { 
      addToast("Please upload a genomic VCF file to proceed.", "error"); 
      return; 
    }
    if (selectedDrugs.length === 0) { 
      addToast("Define at least one target medication for risk analysis.", "error"); 
      return; 
    }

    setLoading(true);
    setReports([]);
    setError(null);
    try {
      const results = await processPGx(vcfContent, selectedDrugs.join(', '));
      setReports(results);
      setActiveReportIdx(0);
    } catch (err) {
      setError("Engine Conflict: A critical error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSuggestions = SUPPORTED_DRUGS.filter(d => 
    d.toLowerCase().includes(drugSearchTerm.toLowerCase()) && !selectedDrugs.includes(d)
  );

  const stats = useMemo(() => getDashboardStats(), [view, reports]);

  const renderNavbar = () => (
    <nav className="bg-white px-8 h-20 flex items-center justify-between sticky top-0 z-50 shadow-sm border-b border-slate-100">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
          <ShieldCheck size={24} />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-slate-900 uppercase">VITALGENE <span className="text-blue-600">AI</span></span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live Engine v1.0.0</span>
          </div>
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-10">
        <button onClick={() => setView('analyzer')} className="text-[12px] font-bold text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Platform</button>
        <button onClick={() => setView('documentation')} className="text-[12px] font-bold text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Documentation</button>
        <button onClick={() => setView('privacy')} className="text-[12px] font-bold text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Privacy</button>
        <a href="https://cpicpgx.org/" target="_blank" rel="noopener noreferrer" className="text-[12px] font-bold text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center gap-1.5">
          Guidelines <ExternalLink size={14} />
        </a>
      </div>

      <button onClick={() => setView('dashboard')} className="px-6 py-2.5 bg-[#0f172a] text-white rounded-full text-[12px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
        <LayoutDashboard size={16} /> Launch Dashboard
      </button>
    </nav>
  );

  const renderFooter = () => (
    <footer className="bg-[#0f172a] py-20 px-8 text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-20">
          <div className="max-w-xs">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck size={28} className="text-cyan-400" />
              <span className="text-2xl font-bold tracking-tight uppercase">VitalGene AI <span className="text-cyan-400">AI</span></span>
            </div>
            <p className="text-blue-200/50 text-xs leading-relaxed mb-6">
              Precision clinical decision support powered by generative intelligence. Developed with high-integrity genomic processing for modern medicine.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/Vatsalgoyal7" target="_blank" className="p-2 bg-white/5 rounded-lg hover:bg-cyan-400 hover:text-[#0f172a] transition-all" title="GitHub Profile">
                <Github size={18}/>
              </a>
              <a href="mailto:vatsalgoyal71@gmail.com" className="p-2 bg-white/5 rounded-lg hover:bg-cyan-400 hover:text-[#0f172a] transition-all" title="Email Us">
                <Mail size={18}/>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 flex-1">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-6">Platform</h4>
              <ul className="space-y-4 text-[11px] font-bold uppercase tracking-widest text-blue-200/60">
                <li><button onClick={() => setView('analyzer')} className="hover:text-cyan-400 transition-colors">Analyzer</button></li>
                <li><button onClick={() => setView('dashboard')} className="hover:text-cyan-400 transition-colors">Dashboard</button></li>
                <li><button onClick={() => setView('documentation')} className="hover:text-cyan-400 transition-colors">Documentation</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-6">Resources</h4>
              <ul className="space-y-4 text-[11px] font-bold uppercase tracking-widest text-blue-200/60">
                <li><a href="https://cpicpgx.org/" target="_blank" className="hover:text-cyan-400 transition-colors">CPIC Guidelines</a></li>
                <li><button onClick={() => setView('privacy')} className="hover:text-cyan-400 transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setView('terms')} className="hover:text-cyan-400 transition-colors">Terms of Use</button></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-6">Contact</h4>
              <p className="text-[11px] font-bold text-blue-200/60 mb-2">Technical Support</p>
              <a href="mailto:vatsalgoyal71@gmail.com" className="text-[11px] font-bold text-white hover:text-cyan-400 transition-colors">vatsalgoyal71@gmail.com</a>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/30">
            Developed by <a href="https://github.com/Vatsalgoyal7" target="_blank" className="text-cyan-400 hover:text-cyan-300 transition-colors">Vatsal Goyal</a> | GitHub: <a href="https://github.com/Vatsalgoyal7" target="_blank" className="text-cyan-400 hover:text-cyan-300 transition-colors">Vatsalgoyal7</a> | Contact: <a href="mailto:vatsalgoyal71@gmail.com" className="text-cyan-400 hover:text-cyan-300 transition-colors">vatsalgoyal71@gmail.com</a>
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-cyan-400/50 uppercase tracking-widest">Version v1.0.0</span>
            <span className="w-1 h-1 bg-white/10 rounded-full"></span>
            <span className="text-[10px] font-bold text-cyan-400/50 uppercase tracking-widest">Live Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );

  const renderLanding = () => (
    <div className="flex flex-col bg-white">
      {renderNavbar()}

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-gradient-to-br from-[#0c1a40] via-[#102a6b] to-[#0f172a] text-white py-24">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <Dna className="absolute top-20 left-20 w-80 h-80 -rotate-12 animate-pulse" />
          <Dna className="absolute bottom-20 right-20 w-80 h-80 rotate-12 animate-pulse" />
        </div>
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-400/20 mb-12">
            <Sparkles size={16} className="text-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200">Precision Genomic Pipeline V4.2</span>
          </div>
          
          <h1 className="text-8xl md:text-9xl font-extrabold mb-10 tracking-tighter leading-[0.9]">Predict Risk.<br/>Save <span className="text-cyan-400">Lives.</span></h1>
          
          <p className="text-lg md:text-xl text-blue-100/70 mb-14 max-w-2xl mx-auto leading-relaxed font-medium">The world's most advanced AI-powered pharmacogenomics analyzer. Aligned with CPIC guidelines to prevent adverse drug reactions before they happen.</p>
          
          <div className="flex flex-wrap items-center justify-center gap-6">
            <button onClick={() => setView('analyzer')} className="px-10 py-5 bg-cyan-400 text-[#0f172a] rounded-full font-extrabold text-[13px] uppercase tracking-widest flex items-center gap-3 hover:bg-cyan-300 transition-all hover:scale-105 shadow-2xl shadow-cyan-400/20">
              Start Analysis <ArrowRight size={18} />
            </button>
            <button onClick={() => setView('documentation')} className="px-10 py-5 bg-white/5 text-white border border-white/10 rounded-full font-extrabold text-[13px] uppercase tracking-widest hover:bg-white/10 transition-all">Research Documentation</button>
          </div>
        </motion.div>

        <div className="absolute bottom-10 left-0 right-0 overflow-hidden py-4 opacity-40">
           <div className="flex gap-4 items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50 mr-4">Supported Medications</span>
              {SUPPORTED_DRUGS.map(d => (
                <div key={d} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-blue-200">{d.toLowerCase()}</div>
              ))}
           </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {[
            { icon: <BrainCircuit className="text-blue-600"/>, title: "AI Intelligence", desc: "Generative clinical explanations with molecular rationale powered by Gemini Pro." },
            { icon: <ClipboardCheck className="text-blue-600"/>, title: "CPIC Engine", desc: "Dosing recommendations strictly aligned with international CPIC clinical standards." },
            { icon: <Lock className="text-blue-600"/>, title: "Secure Processing", desc: "In-memory genomic data handling with zero persistent patient data storage." },
            { icon: <Layers className="text-blue-600"/>, title: "EHR-Ready Output", desc: "Structured JSON schema compatible with modern Electronic Health Record systems." }
          ].map((feat, i) => (
            <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">{feat.icon}</div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{feat.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{feat.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm"><Activity className="text-blue-600" size={28}/></div>
            <h3 className="text-xl font-bold text-slate-900 mb-5">VCF Sequencing</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">Parses raw genomic VCF files (v4.2) to detect single nucleotide polymorphisms in high-impact pharmacogenes.</p>
          </div>
          <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm"><HeartPulse className="text-blue-600" size={28}/></div>
            <h3 className="text-xl font-bold text-slate-900 mb-5">Risk Profiling</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">Advanced diplotype-to-phenotype translation engine supporting Poor through Ultra-Rapid metabolizer statuses.</p>
          </div>
          <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm"><Stethoscope className="text-blue-600" size={28}/></div>
            <h3 className="text-xl font-bold text-slate-900 mb-5">Decision Support</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">Clear clinical guidance including dosing adjustments, monitoring advice, and suggested drug alternatives.</p>
          </div>
        </div>
      </section>

      {renderFooter()}
    </div>
  );

  const renderDocumentation = () => (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      {renderNavbar()}

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><BookOpen size={24}/></div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">System Documentation</h1>
          </div>
          <p className="text-slate-500 text-lg leading-relaxed">Technical specifications and clinical guidelines for the VitalGene AI AI precision genomic pipeline.</p>
        </header>

        <div className="space-y-16">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3"><Server size={20} className="text-blue-500"/> Platform Overview</h2>
            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
              <p>VitalGene AI AI is a clinical-grade pharmacogenomics decision support tool designed to analyze genetic variation and provide medication-specific risk assessments. The system integrates raw VCF parsing with CPIC-aligned clinical logic and LLM-powered explanation generation.</p>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Supported Genes</h3>
              <ul className="space-y-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
                <li>• CYP2D6 (Metabolism)</li>
                <li>• CYP2C19 (Metabolism)</li>
                <li>• CYP2C9 (Metabolism)</li>
                <li>• SLCO1B1 (Transport)</li>
                <li>• TPMT (Metabolism)</li>
                <li>• DPYD (Metabolism)</li>
              </ul>
            </div>
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Risk Categories</h3>
              <ul className="space-y-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <li className="text-emerald-600">• Safe (Standard Dosing)</li>
                <li className="text-amber-600">• Adjust Dosage (IM/RM)</li>
                <li className="text-rose-600">• Toxic (Poor Metabolizer)</li>
                <li className="text-orange-600">• Ineffective (Poor Activation)</li>
                <li className="text-slate-400">• Unknown (Missing Markers)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3"><Terminal size={20} className="text-blue-500"/> API Architecture</h2>
            <p className="text-slate-600 mb-6">VitalGene AI operates a stateless internal engine optimized for high-throughput genomic parsing.</p>
            <div className="bg-[#0f172a] p-8 rounded-3xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
                 <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                 <span className="text-[10px] text-slate-400 font-bold ml-4 uppercase tracking-widest">Diagnostic Object Schema</span>
              </div>
              <pre className="text-cyan-400/80 font-mono text-[11px] leading-relaxed">
{`{
  "patient_id": "P001",
  "drug": "WARFARIN",
  "risk_assessment": {
    "risk_label": "Adjust Dosage",
    "severity": "moderate"
  },
  "pharmacogenomic_profile": {
    "primary_gene": "CYP2C9",
    "phenotype": "IM",
    "diplotype": "*1/*3"
  },
  "clinical_recommendation": {
    "action": "Reduce Dose",
    "dosingGuideline": "Reduce starting dose by 50%."
  }
}`}
              </pre>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3"><GraduationCap size={20} className="text-blue-500"/> Deployment Instructions</h2>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="p-6 border border-slate-100 rounded-2xl">
                <h4 className="font-bold text-slate-900 mb-2">Frontend (Vercel)</h4>
                <p>Deploy the React build folder directly to Vercel. Ensure `API_KEY` environment variable is set for Gemini access.</p>
              </div>
              <div className="p-6 border border-slate-100 rounded-2xl">
                <h4 className="font-bold text-slate-900 mb-2">Backend Services</h4>
                <p>Pharmacogenomic processing is handled in-browser for demo, but can be extracted to a dedicated FastAPI/Python service.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {renderFooter()}
    </div>
  );

  const renderPrivacy = () => (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      {renderNavbar()}

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-20">
        <div className="bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <header className="mb-12">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-6"><Lock size={32}/></div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Privacy & Data Handling</h1>
            <p className="text-slate-500 font-medium">VitalGene AI is built with a security-first philosophy to ensure the confidentiality of patient genomic data.</p>
          </header>

          <div className="space-y-12">
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Genomic Sovereignty</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">All VCF files are processed in-memory. We do not store genomic data permanently on any server unless the "Dashboard Storage" option is explicitly enabled by the user for historical tracking.</p>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-medium flex items-center gap-3">
                <CheckCircle2 size={16}/> HIPAA-ready architecture ensures secure file handling pipelines.
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4">LLM Anonymization</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Before sending clinical data to Gemini/LLM models, all patient identifiers are stripped from the payload. The model receives only variant IDs (rsIDs) and phenotypes to generate clinical rationale, maintaining patient anonymity.</p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Third-Party Policy</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">VitalGene AI AI does not sell, trade, or share genomic or pharmacological profiles with any third-party marketing or research organizations.</p>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Encryption</span>
                    <span className="text-xs font-bold text-slate-800">AES-256 for History Storage</span>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Transport</span>
                    <span className="text-xs font-bold text-slate-800">TLS 1.3 End-to-End</span>
                 </div>
              </div>
            </section>

            <section className="pt-10 border-t border-slate-100">
               <h3 className="text-lg font-bold text-slate-900 mb-4">Enterprise Compliance Roadmap</h3>
               <p className="text-slate-600 text-sm leading-relaxed">Our future scope includes SOC2 Type II certification and full GDPR compliance for European medical networks.</p>
            </section>
          </div>
        </div>
      </main>

      {renderFooter()}
    </div>
  );

  const renderTerms = () => (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      {renderNavbar()}

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-20">
        <div className="bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <header className="mb-12">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-6"><Scale size={32}/></div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Terms of Use</h1>
            <p className="text-slate-500 font-medium">Legal and compliance documentation for the VitalGene AI AI platform.</p>
          </header>

          <div className="space-y-12">
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4">1. Medical Disclaimer</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                This application is for educational and research purposes only. It does not provide medical advice, diagnosis, or treatment. 
                Clinical decisions must be made by licensed healthcare professionals. Any pharmacological guidance provided by the AI engine 
                is intended solely as an adjunctive decision support tool and should not override clinical judgment.
              </p>
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-3">
                <AlertTriangle size={16} className="shrink-0"/> WARNING: Do not adjust medication doses without consulting a physician.
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4">2. Data Privacy & Security</h3>
              <ul className="space-y-4 text-slate-600 text-sm leading-relaxed list-disc pl-5">
                <li>Uploaded VCF files are processed temporarily in memory for the duration of the analysis.</li>
                <li>No genomic data is permanently stored on external servers or local caches beyond session life.</li>
                <li>No patient data is shared with third parties, pharmaceutical companies, or research organizations.</li>
                <li>Users are responsible for ensuring compliance with local data protection laws (e.g., GDPR, HIPAA, CCPA) when uploading clinical samples.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4">3. AI Limitation Clause</h3>
              <ul className="space-y-4 text-slate-600 text-sm leading-relaxed list-disc pl-5">
                <li>Risk predictions are algorithmic estimates based on known variants; unknown or rare variants may not be captured.</li>
                <li>LLM-generated explanations are synthesized from genetic markers and may contain inaccuracies or hallucinated rationale.</li>
                <li>All results should be independently validated against official CPIC (Clinical Pharmacogenetics Implementation Consortium) guidelines.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4">4. No Liability Clause</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                The developers are not liable for any medical, financial, or legal consequences resulting from the use of this platform. 
                Users assume all responsibility for the interpretation and application of the diagnostic reports generated by VitalGene AI AI.
              </p>
            </section>

            <section className="pt-10 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">5. Contact Information</h3>
              <p className="text-slate-600 text-sm mb-6">For questions, concerns, or enterprise integration concerns, please contact the development team:</p>
              <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-3">
                    <Mail size={18} className="text-blue-500"/>
                    <a href="mailto:vatsalgoyal71@gmail.com" className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors">vatsalgoyal71@gmail.com</a>
                 </div>
                 <div className="flex items-center gap-3">
                    <Github size={18} className="text-blue-500"/>
                    <a href="https://github.com/Vatsalgoyal7" target="_blank" className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors underline decoration-blue-200">github.com/Vatsalgoyal7</a>
                 </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {renderFooter()}
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      {renderNavbar()}

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-12">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm"><LayoutDashboard size={20}/></div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">System Dashboard</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Real-time clinical diagnostics overview and population risk distribution.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Analyses", val: stats.totalAnalyses, icon: <FileText size={20}/>, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "High Risk Flags", val: stats.highRiskCount, icon: <ShieldAlert size={20}/>, color: "text-rose-600", bg: "bg-rose-50" },
            { label: "Most Checked Drug", val: stats.topDrug, icon: <Pill size={20}/>, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Last Analysis", val: stats.lastAnalysis ? new Date(stats.lastAnalysis).toLocaleDateString() : 'None', icon: <Calendar size={20}/>, color: "text-emerald-600", bg: "bg-emerald-50" }
          ].map((s, i) => (
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: i*0.1}} key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <div className={`w-14 h-14 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center shrink-0`}>{s.icon}</div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{s.label}</span>
                <span className="text-xl font-bold text-slate-900">{s.val}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <section className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp size={18} className="text-blue-600"/>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Risk Distribution</h2>
            </div>
            
            <div className="space-y-6">
              {Object.entries(stats.riskDistribution).map(([label, count]) => (
                <div key={label}>
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider mb-2">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-900">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{width: 0}} 
                      animate={{width: stats.totalAnalyses ? `${((count as number) / stats.totalAnalyses) * 100}%` : '0%'}} 
                      className={`h-full rounded-full ${
                        label === 'Safe' ? 'bg-emerald-500' :
                        label === 'Adjust Dosage' ? 'bg-amber-500' :
                        label === 'Toxic' ? 'bg-rose-500' :
                        label === 'Ineffective' ? 'bg-orange-500' : 'bg-slate-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <History size={18} className="text-blue-600"/>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Recent Diagnostics</h2>
              </div>
              <button onClick={() => { clearHistory(); window.location.reload(); }} className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest border border-rose-100">Clear Logs</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medication</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gene</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Level</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.recentAnalyses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm italic font-medium">No recent analyses found. Execute a pipeline to populate dashboard.</td>
                    </tr>
                  ) : (
                    stats.recentAnalyses.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-[11px] font-medium text-slate-500">{new Date(r.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 text-[12px] font-bold text-slate-700">{r.patient_id}</td>
                        <td className="px-6 py-4 text-[12px] font-bold text-blue-600">{r.drug}</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">{r.pharmacogenomic_profile.primary_gene}</td>
                        <td className="px-6 py-4">
                           <RiskBadge label={r.risk_assessment.risk_label} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setShowJsonModal(r)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="View Object"><FileJson size={16}/></button>
                            <button onClick={() => downloadJson(r)} className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors"><Download size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {renderFooter()}
    </div>
  );

  const renderAnalyzer = () => (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      {renderNavbar()}

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-12">
        <header className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-4">Pharmacogenomic Analysis</p>
          <h1 className="text-4xl font-bold text-slate-900 mb-6">Analyze Your Genetic Data</h1>
          <p className="text-slate-500 leading-relaxed text-[15px]">Upload your VCF file and select medications to receive personalized pharmacogenomic risk assessments and clinical recommendations.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <section className="bg-white rounded-3xl border border-slate-100 shadow-kimi p-8">
            <header className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-white text-blue-600 border border-slate-100 rounded-xl flex items-center justify-center shadow-sm"><LayoutDashboard size={20} /></div>
              <div><h2 className="text-lg font-bold text-slate-900">Input Parameters</h2><p className="text-xs text-slate-400">Upload genetic data and select medications</p></div>
            </header>

            <div className="space-y-10">
              <section>
                <label className="block text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">VCF File Upload</label>
                <label className={`group block rounded-2xl p-8 text-center cursor-pointer transition-all ${vcfFile ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50/30 dashed-border'}`}>
                  {vcfFile ? (
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-500 border border-emerald-100"><FileCode size={20}/></div>
                      <div className="flex-1 overflow-hidden">
                        <span className="text-sm font-bold text-slate-700 block truncate">{vcfFile.name}</span>
                        <span className="text-[11px] text-emerald-600 font-medium">VCF file loaded successfully</span>
                      </div>
                      <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><Info size={14}/></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <UploadCloud size={32} className="text-slate-300 group-hover:text-blue-400 mb-4 transition-colors" />
                      <span className="text-sm font-semibold text-slate-700 block mb-1">Drop your VCF file here, or click to browse</span>
                      <span className="text-[11px] text-slate-400">Supports VCF v4.2 files up to 5MB</span>
                    </div>
                  )}
                  <input type="file" className="sr-only" onChange={handleFileUpload} accept=".vcf" />
                </label>
              </section>

              <section>
                <label className="block text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Or use a sample file:</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(SAMPLES).map(name => (
                    <button key={name} onClick={() => loadSample(name)} className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-lg hover:bg-slate-200 transition-all border border-transparent">{name}</button>
                  ))}
                </div>
              </section>

              <section>
                <label className="block text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Select Medications</label>
                <div className="space-y-4">
                  {selectedDrugs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedDrugs.map(drug => (
                        <div key={drug} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-[10px] font-bold uppercase tracking-wider">
                           <LinkIcon size={12}/> {drug} <button onClick={() => removeDrug(drug)} className="p-0.5 hover:bg-blue-200 rounded-full"><X size={12}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="relative" ref={dropdownRef}>
                    <input type="text" value={drugSearchTerm} onChange={(e) => { setDrugSearchTerm(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} placeholder="Type drug name (e.g., Codeine) or select from list" className="w-full h-12 pl-12 pr-12 bg-white border border-slate-200 rounded-xl text-[13px] focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm" />
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none"><Search size={16} className="text-slate-300"/></div>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none"><ChevronDown size={16} className="text-slate-300"/></div>
                    <AnimatePresence>
                      {isDropdownOpen && (drugSearchTerm || filteredSuggestions.length > 0) && (
                        <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-auto">
                          {filteredSuggestions.map(drug => (
                            <button key={drug} onClick={() => addDrug(drug)} className="w-full px-5 py-3 text-left text-[13px] font-medium text-slate-700 hover:bg-blue-50 border-b border-slate-50 last:border-none flex justify-between items-center">{drug} <Plus size={14} className="text-slate-300"/></button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>

              <button onClick={handleSubmit} disabled={loading} className={`w-full h-14 rounded-xl flex items-center justify-center gap-3 text-sm font-bold tracking-tight transition-all shadow-lg ${loading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={20} /> Run Pharmacogenomic Analysis</> }
              </button>

              {error && <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex gap-4 text-rose-700"><ShieldAlert size={20} className="shrink-0"/><p className="text-xs font-medium">{error}</p></div>}
            </div>
          </section>

          <section className="min-h-[600px] flex flex-col">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-kimi flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <BrainCircuit size={48} className="text-blue-500 animate-pulse mb-6" />
                  <h3 className="text-xl font-bold mb-4">Analyzing Genomic Profile...</h3>
                  <div className="w-full max-w-xs bg-slate-100 h-1 rounded-full overflow-hidden mb-8"><motion.div initial={{ width: 0 }} animate={{ width: `${((loadingStep + 1) / AnalysisSteps.length) * 100}%` }} className="h-full bg-blue-500" /></div>
                  <div className="space-y-2 text-left w-full max-w-xs">
                    {AnalysisSteps.map((s, i) => (
                      <div key={i} className={`text-[10px] font-bold uppercase tracking-widest ${i <= loadingStep ? 'text-blue-600' : 'text-slate-300'}`}>{i < loadingStep ? '✓ ' : i === loadingStep ? '• ' : '  '}{s}</div>
                    ))}
                  </div>
                </motion.div>
              ) : reports.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashed-border rounded-3xl flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/20">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-6"><Trash2 size={28} /></div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">No Analysis Results Yet</h3>
                  <p className="text-[12px] text-slate-500 max-w-[280px] mx-auto">Upload VCF and select drugs to see results.</p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-6">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {reports.map((r, i) => (
                      <button key={i} onClick={() => setActiveReportIdx(i)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shadow-sm border ${activeReportIdx === i ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100'}`}>{r.drug}</button>
                    ))}
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-100 shadow-kimi flex-1 flex flex-col overflow-hidden">
                    <header className="px-8 py-8 border-b border-slate-50 bg-slate-50/20 flex flex-col gap-4">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                         <span>Patient: {reports[activeReportIdx].patient_id}</span>
                         <div className="flex gap-2">
                           <button onClick={() => setShowJsonModal(reports[activeReportIdx])} className="p-2 hover:bg-white rounded-lg transition-colors"><Copy size={16}/></button>
                           <button onClick={() => downloadJson(reports[activeReportIdx])} className="p-2 hover:bg-white rounded-lg transition-colors"><Download size={16}/></button>
                         </div>
                      </div>
                      <div className="flex items-center gap-4"><LinkIcon className="text-blue-500" size={24}/><h3 className="text-3xl font-bold text-slate-900">{reports[activeReportIdx].drug}</h3></div>
                      <div className="mt-4 p-5 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100"><AlertTriangle size={24}/></div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <span className="text-xl font-bold text-slate-900">{reports[activeReportIdx].risk_assessment.risk_label}</span>
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase">{reports[activeReportIdx].risk_assessment.severity} RISK</span>
                               </div>
                               <p className="text-[11px] text-slate-500 font-medium">Confidence Score: {Math.round(reports[activeReportIdx].risk_assessment.confidence_score * 100)}%</p>
                            </div>
                         </div>
                      </div>
                    </header>

                    <div className="p-8 space-y-6 overflow-auto custom-scrollbar flex-1">
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <button onClick={() => setExpandedSections(s => ({...s, profile: !s.profile}))} className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
                          <div className="flex items-center gap-3 text-blue-600 font-bold text-sm"><Dna size={18}/> Pharmacogenomic Profile</div>
                          <ChevronUp className={`transition-transform duration-300 ${!expandedSections.profile ? 'rotate-180' : ''}`} size={18}/>
                        </button>
                        <AnimatePresence>{expandedSections.profile && <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden bg-white"><div className="p-6"><div className="grid grid-cols-2 gap-6 mb-8"><div className="p-4 bg-slate-50 rounded-xl"><span className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Primary Gene</span><span className="text-2xl font-bold text-slate-900">{reports[activeReportIdx].pharmacogenomic_profile.primary_gene}</span></div><div className="p-4 bg-slate-50 rounded-xl"><span className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Phenotype</span><span className="text-2xl font-bold text-slate-900">{reports[activeReportIdx].pharmacogenomic_profile.phenotype}</span></div></div><div className="mb-8"><span className="block text-[11px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Diplotype</span><span className="text-3xl font-bold text-slate-900">{reports[activeReportIdx].pharmacogenomic_profile.diplotype}</span></div><div><span className="block text-[11px] font-bold text-slate-400 uppercase mb-4 tracking-widest">Detected Variants</span><div className="space-y-2">{reports[activeReportIdx].pharmacogenomic_profile.detected_variants.map((v, i) => (<div key={i} className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between group hover:bg-blue-100 transition-colors"><div className="flex items-center gap-3"><span className="text-[12px] font-bold text-blue-600 underline cursor-pointer">{v.rsid}</span><span className="text-[11px] font-bold text-slate-800">{v.starAllele} <span className="font-normal text-slate-500">— {v.significance}</span></span></div><ChevronRight size={14} className="text-blue-300 group-hover:translate-x-1 transition-transform"/></div>))}</div></div></div></motion.div>}</AnimatePresence>
                      </div>
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <button onClick={() => setExpandedSections(s => ({...s, recommendation: !s.recommendation}))} className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
                          <div className="flex items-center gap-3 text-emerald-600 font-bold text-sm"><ShieldCheck size={18}/> Clinical Recommendation</div>
                          <ChevronUp className={`transition-transform duration-300 ${!expandedSections.recommendation ? 'rotate-180' : ''}`} size={18}/>
                        </button>
                        <AnimatePresence>{expandedSections.recommendation && <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden bg-white"><div className="p-8 bg-emerald-50/20 border-l-[6px] border-emerald-500"><h4 className="text-xl font-bold text-slate-900 mb-4">{reports[activeReportIdx].clinical_recommendation.dosingGuideline}</h4><div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-emerald-100/50"><div><span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Primary Action</span><span className="text-sm font-bold text-slate-800 uppercase">{reports[activeReportIdx].clinical_recommendation.action}</span></div><div><span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Guideline</span><p className="text-[11px] text-slate-600 font-medium leading-relaxed">{reports[activeReportIdx].clinical_recommendation.cpicGuideline}</p></div></div></div></motion.div>}</AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {renderFooter()}
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case 'landing': return renderLanding();
      case 'analyzer': return renderAnalyzer();
      case 'dashboard': return renderDashboard();
      case 'documentation': return renderDocumentation();
      case 'privacy': return renderPrivacy();
      case 'terms': return renderTerms();
      default: return renderLanding();
    }
  };

  return (
    <>
      <div className="relative">
        {renderContent()}
      </div>

      <AnimatePresence>
        {showJsonModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3 font-bold text-slate-800 uppercase tracking-widest text-sm"><FileJson size={20}/> Diagnostic Object</div>
                <div className="flex gap-2">
                   <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(showJsonModal, null, 2)); addToast("Copied to clipboard", "success"); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Copy JSON</button>
                   <button onClick={() => setShowJsonModal(null)} className="p-2 hover:bg-slate-200 rounded-lg"><X size={20}/></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-[#0f172a] p-8 custom-scrollbar">
                <pre className="text-cyan-400/80 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{JSON.stringify(showJsonModal, null, 2)}</pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed top-20 right-6 z-[110] pointer-events-none flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div key={toast.id} initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-2xl shadow-xl border flex items-center gap-3 bg-white ${toast.type === 'error' ? 'border-rose-100 text-rose-700' : toast.type === 'success' ? 'border-emerald-100 text-emerald-700' : 'border-blue-100 text-blue-700'}`}>
              <div className={`p-2 rounded-xl ${toast.type === 'error' ? 'bg-rose-50 text-rose-500' : toast.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>{toast.type === 'error' ? <AlertTriangle size={18}/> : toast.type === 'success' ? <CheckCircle2 size={18}/> : <Info size={18}/>}</div>
              <p className="text-[13px] font-semibold flex-1">{toast.message}</p>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><X size={14} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
