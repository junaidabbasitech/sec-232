import React, { useState } from 'react';
import { 
  Search, 
  Globe, 
  ShieldAlert, 
  ArrowRight, 
  MapPin, 
  Scale, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { determineDuty, DeterminationResult } from '../data/tariffEngine';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function TariffEngine() {
  const [htsCode, setHtsCode] = useState('');
  const [origin, setOrigin] = useState('OTHER');
  const [result, setResult] = useState<DeterminationResult | null>(null);

  const handleDetermine = () => {
    const res = determineDuty(htsCode, origin);
    setResult(res);
  };

  const origins = [
    { value: 'OTHER', label: 'General (Other)' },
    { value: 'RUSSIA', label: 'Russia' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'CHINA', label: 'China' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary border border-border-theme rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-accent">
          <Scale size={24} />
          Section 232 Automated Tariff Engine
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest">HTS Code</label>
            <div className="relative">
              <input 
                type="text" 
                value={htsCode}
                onChange={(e) => setHtsCode(e.target.value)}
                placeholder="e.g. 7206.10"
                className="w-full bg-bg-primary border border-border-theme rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent transition-all"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest">Country of Origin</label>
            <div className="flex gap-2">
              {origins.map(o => (
                <button
                  key={o.value}
                  onClick={() => setOrigin(o.value)}
                  className={cn(
                    "flex-1 py-3 px-2 rounded-xl border text-[10px] font-bold uppercase tracking-tight transition-all",
                    origin === o.value 
                      ? "bg-accent border-accent text-bg-primary shadow-lg" 
                      : "bg-bg-primary border-border-theme text-text-dim hover:border-accent/50"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={handleDetermine}
          className="w-full py-4 bg-accent text-bg-primary font-bold rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)] transition-all flex items-center justify-center gap-2"
        >
          Run Duty Determination
          <ArrowRight size={18} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div 
            key={result.htsCode + result.error}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {result.error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
                <ShieldAlert size={48} className="text-red-500" />
                <h3 className="text-xl font-bold text-red-500">{result.error}</h3>
                <p className="text-sm text-text-dim max-w-md">
                  The HTS code provided was not identified in the Annexes. Please verify the classification manually or consult the official HTSUS schedule.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Step 1 & Result Card */}
                <div className="space-y-4">
                  <div className="bg-bg-secondary border border-border-theme rounded-2xl p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Legal Determination</span>
                      <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-bold">HTS: {result.htsCode}</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center py-8">
                        <span className="text-[10px] text-text-dim font-bold uppercase tracking-widest mb-2">Final Section 232 Duty</span>
                        <h3 className="text-6xl font-black text-accent tracking-tighter mb-4">{result.finalDuty}</h3>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium text-text-dim">Origin: {origin}</span>
                            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium text-text-dim">{result.step1.metalClass}</span>
                        </div>
                    </div>

                    <div className="border-t border-border-theme pt-6 space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Step 1: Initial Classification</h4>
                        <div className="grid grid-cols-3 gap-2">
                           <div className="bg-bg-primary p-3 rounded-xl border border-border-theme text-center">
                              <span className="text-[8px] text-text-dim block mb-1 uppercase">Annex</span>
                              <span className="text-xs font-bold">{result.step1.annex}</span>
                           </div>
                           <div className="bg-bg-primary p-3 rounded-xl border border-border-theme text-center">
                              <span className="text-[8px] text-text-dim block mb-1 uppercase">Metal</span>
                              <span className="text-xs font-bold">{result.step1.metalClass}</span>
                           </div>
                           <div className="bg-bg-primary p-3 rounded-xl border border-border-theme text-center">
                              <span className="text-[8px] text-text-dim block mb-1 uppercase">Status</span>
                              <span className="text-xs font-bold whitespace-nowrap">{result.step1.status}</span>
                           </div>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 Logic Gates */}
                <div className="space-y-4">
                    <div className="bg-bg-secondary border border-border-theme rounded-2xl p-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-6">Step 2: Automated Logic Gates</h4>
                        
                        <div className="space-y-4">
                            {/* Gate A */}
                            <div className={cn(
                                "p-4 rounded-xl border transition-all",
                                result.step2.gateA.applied ? "bg-accent/5 border-accent/20" : "bg-bg-primary border-border-theme opacity-50"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Globe size={14} className={result.step2.gateA.applied ? "text-accent" : "text-text-dim"} />
                                        <span className="text-[10px] font-bold uppercase">Gate A: Origin Check</span>
                                    </div>
                                    {result.step2.gateA.applied ? <CheckCircle size={14} className="text-accent" /> : <div className="w-3 h-3 rounded-full border border-text-dim" />}
                                </div>
                                <p className="text-[11px] text-text-dim">
                                    {result.step2.gateA.applied 
                                        ? `APPLIED: ${result.step2.gateA.reason}. Blocked 15% rule.` 
                                        : "Bypassed: Non-Russia origin."}
                                </p>
                            </div>

                            {/* Gate B */}
                            <div className={cn(
                                "p-4 rounded-xl border transition-all",
                                result.step2.gateB.applied ? "bg-accent/5 border-accent/20" : "bg-bg-primary border-border-theme opacity-50"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className={result.step2.gateB.applied ? "text-accent" : "text-text-dim"} />
                                        <span className="text-[10px] font-bold uppercase">Gate B: Chapter 99 Mapping</span>
                                    </div>
                                    {result.step2.gateB.applied ? <CheckCircle size={14} className="text-accent" /> : <div className="w-3 h-3 rounded-full border border-text-dim" />}
                                </div>
                                <div className="text-[11px] text-text-dim space-y-1">
                                    <p>Provision: <span className="text-text-main font-mono">{result.step2.gateB.provision}</span></p>
                                    <p>Mapped Duty: <span className="text-accent font-bold">{result.step2.gateB.duty}</span></p>
                                    {result.step2.gateB.reason && <p className="italic text-[10px]">Note: {result.step2.gateB.reason}</p>}
                                </div>
                            </div>

                            {/* Gate C */}
                            <div className={cn(
                                "p-4 rounded-xl border transition-all",
                                result.step2.gateC.flagged ? "bg-yellow-500/5 border-yellow-500/20" : "bg-bg-primary border-border-theme opacity-50"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert size={14} className={result.step2.gateC.flagged ? "text-yellow-500" : "text-text-dim"} />
                                        <span className="text-[10px] font-bold uppercase">Gate C: 95% Rule Check</span>
                                    </div>
                                    {result.step2.gateC.flagged ? <AlertTriangle size={14} className="text-yellow-500" /> : <div className="w-3 h-3 rounded-full border border-text-dim" />}
                                </div>
                                <p className="text-[11px] text-text-dim">
                                    Requirement: <span className="text-text-main">{result.step2.gateC.rule}</span>
                                </p>
                                {result.step2.gateC.flagged && (
                                    <p className="mt-2 text-[10px] text-yellow-500 font-medium flex items-center gap-1">
                                        <Info size={10} /> FLAG: Verification of processing details required for compliance.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
