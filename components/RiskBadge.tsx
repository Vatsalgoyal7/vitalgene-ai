import React from 'react';
import { RiskLabel } from '../types';

interface RiskBadgeProps {
  label: RiskLabel;
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ label }) => {
  const styles: Record<RiskLabel, string> = {
    'Safe': 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-100/20',
    'Adjust Dosage': 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-100/20',
    'Toxic': 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-100/20',
    'Ineffective': 'bg-orange-50 text-orange-700 border-orange-100 shadow-orange-100/20',
    'Unknown': 'bg-slate-50 text-slate-700 border-slate-100 shadow-slate-100/20',
  };

  const icons: Record<RiskLabel, React.ReactNode> = {
    'Safe': <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>,
    'Adjust Dosage': <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    'Toxic': <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Ineffective': <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
    'Unknown': <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };

  return (
    <div className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-[10px] font-bold border shadow-sm transition-all hover:shadow-md ${styles[label]}`}>
      {icons[label]}
      <span className="uppercase tracking-widest">{label}</span>
    </div>
  );
};

export default RiskBadge;