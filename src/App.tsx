/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Moon, 
  Sun, 
  ZoomIn, 
  ZoomOut, 
  FileText, 
  LayoutGrid, 
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  RotateCcw,
  X,
  Highlighter,
  Trash2,
  Layers,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { htsData } from './data/htsData';
import { documentText } from './data/documentText';
import { keyHighlights, actionRequired } from './data/highlights';
import { HTSItem, Theme } from './types';
import { cn } from './lib/utils';
import { getTariffsForSubdivision } from './data/tariffRules';

interface UserHighlight {
  id: string;
  text: string;
  color: string;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedAnnex, setSelectedAnnex] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDuty, setSelectedDuty] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'code' | 'description'>('code');
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'grid' | 'document'>('grid');
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [showHighlights, setShowHighlights] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<HTSItem | null>(null);
  const [userHighlights, setUserHighlights] = useState<UserHighlight[]>(() => {
    const saved = localStorage.getItem('hts_user_highlights');
    return saved ? JSON.parse(saved) : [];
  });
  const [highlighterColor, setHighlighterColor] = useState('#fbbf24'); // Default yellow
  
  const docContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Persist highlights
  useEffect(() => {
    localStorage.setItem('hts_user_highlights', JSON.stringify(userHighlights));
  }, [userHighlights]);

  // Sync theme with document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auto-scroll to highlighted code
  useEffect(() => {
    if (highlightedCode && docContainerRef.current) {
      const lines = documentText.split('\n');
      const targetIndex = lines.findIndex(line => line.includes(highlightedCode));
      
      if (targetIndex !== -1 && lineRefs.current[targetIndex]) {
        lineRefs.current[targetIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [highlightedCode]);

  const annexes = useMemo(() => {
    const unique = Array.from(new Set(htsData.map(item => item.annex)));
    return ['All', ...unique];
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(htsData.map(item => item.category).filter(Boolean)));
    return ['All', ...unique as string[]];
  }, []);

  const dutyRates = useMemo(() => {
    const unique = Array.from(new Set(htsData.map(item => item.dutyRate).filter(Boolean)));
    return ['All', ...unique as string[]];
  }, []);

  // Helper to check if HTS code is in Chapters 72, 73, 74, or 76
  const isCoreMetalChapter = (code: string) => {
    const chapter = code.substring(0, 2);
    return ['72', '73', '74', '76'].includes(chapter);
  };

  const getComplianceNote = (item: HTSItem) => {
    if (!isCoreMetalChapter(item.code)) {
      return 'Compliance Note: This article is subject to the 15% metal weight rule; if metal content is below 15%, the duty is 0% (9903.82.03).';
    }
    return item.notes;
  };

  const getAdditionalTariffCode = (item: HTSItem) => {
    if (item.additionalTariff) return item.additionalTariff;
    if (item.annex === 'Annex I-A') return '9903.82.02';
    if (item.annex === 'Annex I-B') return '9903.82.09';
    return '9903.82.xx';
  };

  const getDutyRate = (item: HTSItem) => {
    if (item.dutyRate) return item.dutyRate;
    if (item.annex === 'Annex I-A') return '50%';
    if (item.annex === 'Annex I-B') return '25%';
    return 'Check Rules';
  };

  const renderDocumentLine = (line: string, i: number) => {
    const isHighlighted = highlightedCode && line.includes(highlightedCode);
    
    // Detect if line is a list of HTS codes (e.g. "7601 7604 7605 7606")
    const htsListMatch = line.match(/^(\d{4}(\.\d{2}){0,2}(\.\d{4})?\s*)+$/);
    if (htsListMatch && line.trim().length > 0 && !line.includes(' ')) {
        // Single code line - handle as regular or grid
    } else if (htsListMatch && line.trim().length > 0) {
      const codes = line.trim().split(/\s+/);
      return (
        <div key={i} className="grid grid-cols-4 md:grid-cols-6 gap-2 py-3 px-4 bg-slate-50/50 rounded-lg my-1">
          {codes.map((code, idx) => (
            <button
              key={idx}
              onClick={() => handleCodeClick(code)}
              className={cn(
                "text-[10px] font-mono font-bold p-1.5 rounded border transition-all",
                highlightedCode === code 
                  ? "bg-accent text-white border-accent shadow-md scale-105" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-accent hover:text-accent"
              )}
            >
              {code}
            </button>
          ))}
        </div>
      );
    }

    const htsMatch = line.match(/^(\d{4}(\.\d{2}){0,2}(\.\d{4})?)\s+(.+)$/);
    
    if (htsMatch) {
      const [, code, , , description] = htsMatch;
      return (
        <div 
          key={i} 
          ref={el => lineRefs.current[i] = el}
          onMouseMove={(e) => handleDocHover(e, line)}
          onMouseLeave={() => setTooltip(null)}
          onClick={() => handleCodeClick(code)}
          className={cn(
            "grid grid-cols-[120px_1fr] gap-4 py-2 px-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group",
            isHighlighted && "bg-yellow-100 border-l-4 border-yellow-400 -mx-4"
          )}
        >
          <span className="font-mono font-bold text-slate-900 group-hover:text-accent">{code}</span>
          <span className="text-slate-600 text-xs leading-relaxed">{highlightText(description, highlightedCode || '', true)}</span>
        </div>
      );
    }

    // Header detection
    if (line.startsWith('Annex') || line.startsWith('(') || line.includes('Tariff on Full Value')) {
      return (
        <div 
          key={i} 
          ref={el => lineRefs.current[i] = el}
          className="mt-8 mb-4 px-4 py-3 bg-slate-900 text-white rounded-lg font-bold uppercase tracking-widest text-[10px] shadow-sm"
        >
          {line}
        </div>
      );
    }

    return (
      <div 
        key={i} 
        ref={el => lineRefs.current[i] = el}
        onMouseMove={(e) => handleDocHover(e, line)}
        onMouseLeave={() => setTooltip(null)}
        className={cn(
          "py-2 px-4 text-slate-700 leading-relaxed text-sm",
          isHighlighted && "bg-yellow-100 border-l-4 border-yellow-400 -mx-4"
        )}
      >
        {highlightText(line, highlightedCode || '', true)}
      </div>
    );
  };

  const filteredData = useMemo(() => {
    return htsData
      .filter(item => {
        const query = searchQuery.toLowerCase().replace(/\./g, '');
        const itemCode = item.code.replace(/\./g, '');
        const matchesSearch = 
          itemCode.includes(query) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAnnex = selectedAnnex === 'All' || item.annex === selectedAnnex;
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesDuty = selectedDuty === 'All' || item.dutyRate === selectedDuty;
        return matchesSearch && matchesAnnex && matchesCategory && matchesDuty;
      })
      .sort((a, b) => {
        if (sortBy === 'code') return a.code.localeCompare(b.code);
        return a.description.localeCompare(b.description);
      });
  }, [searchQuery, selectedAnnex, selectedCategory, selectedDuty, sortBy]);

  const handleReset = () => {
    setSearchQuery('');
    setSelectedAnnex('All');
    setSelectedCategory('All');
    setSelectedDuty('All');
    setSortBy('code');
    setHighlightedCode(null);
    setShowHighlights(false);
    setZoom(100);
    setUserHighlights([]);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      if (!userHighlights.some(h => h.text === text)) {
        setUserHighlights(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          text,
          color: highlighterColor
        }]);
      }
      selection.removeAllRanges();
    }
  };

  const highlightText = (text: string, highlight: string, isDoc = false) => {
    if (!highlight.trim() && userHighlights.length === 0) return text;
    
    // Create a regex that matches the search query AND all user highlights
    const userPatterns = userHighlights.map(h => h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const allPatterns = [
      highlight.trim() ? highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null,
      ...userPatterns
    ].filter(Boolean) as string[];

    if (allPatterns.length === 0) return text;

    const regex = new RegExp(`(${allPatterns.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) => {
          const lowerPart = part.toLowerCase();
          
          // Check if it's the search highlight
          if (highlight && lowerPart === highlight.toLowerCase()) {
            return (
              <mark key={i} className={cn(
                "rounded-sm px-0.5 transition-colors",
                isDoc ? "bg-yellow-200 text-slate-900" : "bg-accent/20 text-accent"
              )}>{part}</mark>
            );
          }

          // Check if it's a user highlight
          const userH = userHighlights.find(h => h.text.toLowerCase() === lowerPart);
          if (userH) {
            return (
              <mark 
                key={i} 
                style={{ backgroundColor: userH.color }}
                className="rounded-sm px-0.5 text-slate-900"
              >
                {part}
              </mark>
            );
          }

          return part;
        })}
      </span>
    );
  };

  const handleDocHover = (e: React.MouseEvent, line: string) => {
    const htsMatch = line.match(/\d{4}(\.\d{2}){0,2}(\.\d{4})?/);
    if (htsMatch) {
      const code = htsMatch[0];
      const item = htsData.find(i => i.code === code);
      if (item) {
        setTooltip({
          text: `HTS ${item.code}: ${item.description} | ${item.annex}`,
          x: e.clientX,
          y: e.clientY
        });
        return;
      }
    }
    setTooltip(null);
  };

  const handleCodeClick = (code: string) => {
    const item = htsData.find(i => i.code === code);
    if (item) {
      setSelectedItem(item);
      setHighlightedCode(code);
      // Ensure document view is active on mobile
      if (window.innerWidth < 1024) setViewMode('document');
      
      // Trigger scroll after a short delay to ensure DOM is ready if we just switched views
      setTimeout(() => {
        const lines = documentText.split('\n');
        const targetIndex = lines.findIndex(line => line.includes(code));
        if (targetIndex !== -1 && lineRefs.current[targetIndex]) {
          lineRefs.current[targetIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 100);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary text-text-main transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <aside className="w-[260px] bg-bg-secondary border-r border-border-theme hidden md:flex flex-col">
        <div className="p-6 border-b border-border-theme flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded shadow-[0_0_15px_rgba(56,189,248,0.4)]" />
          <span className="font-bold text-lg tracking-tight">HTS ANALYTICA</span>
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <div className="px-4 mb-2 text-[10px] uppercase tracking-widest text-text-dim font-bold">Main</div>
          <button 
            onClick={() => { setSelectedAnnex('All'); setSelectedCategory('All'); setSelectedDuty('All'); setShowHighlights(false); }}
            className={cn(
              "w-full px-6 py-3 text-sm flex items-center gap-3 transition-all",
              !showHighlights && selectedAnnex === 'All' && selectedCategory === 'All' && selectedDuty === 'All' ? "text-text-main bg-white/5 border-l-4 border-accent" : "text-text-dim hover:text-text-main hover:bg-white/5"
            )}
          >
            <LayoutGrid size={18} />
            Dashboard
          </button>
          
          <button 
            onClick={() => setShowHighlights(true)}
            className={cn(
              "w-full px-6 py-3 text-sm flex items-center gap-3 transition-all",
              showHighlights ? "text-text-main bg-white/5 border-l-4 border-accent" : "text-text-dim hover:text-text-main hover:bg-white/5"
            )}
          >
            <BookOpen size={18} />
            Key Highlights
          </button>

          <div className="px-4 mt-6 mb-2 text-[10px] uppercase tracking-widest text-text-dim font-bold">Advanced Filters</div>
          
          {/* Annex Filter */}
          <div className="px-6 py-2 space-y-2">
            <label className="text-[10px] text-text-dim font-bold flex items-center gap-2 uppercase tracking-widest">
              <FileText size={12} className="text-accent" /> Annex
            </label>
            <div className="relative">
              <select 
                value={selectedAnnex}
                onChange={(e) => setSelectedAnnex(e.target.value)}
                className="w-full bg-bg-primary border border-border-theme rounded-lg px-3 py-2 text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all appearance-none cursor-pointer"
              >
                {annexes.map(a => <option key={a} value={a} className="bg-bg-secondary">{a}</option>)}
              </select>
              <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-text-dim pointer-events-none" />
            </div>
          </div>

          {/* Category Filter */}
          <div className="px-6 py-2 space-y-2">
            <label className="text-[10px] text-text-dim font-bold flex items-center gap-2 uppercase tracking-widest">
              <Layers size={12} className="text-accent" /> Category
            </label>
            <div className="relative">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-bg-primary border border-border-theme rounded-lg px-3 py-2 text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all appearance-none cursor-pointer"
              >
                {categories.map(c => <option key={c} value={c} className="bg-bg-secondary">{c}</option>)}
              </select>
              <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-text-dim pointer-events-none" />
            </div>
          </div>

          {/* Duty Rate Filter */}
          <div className="px-6 py-2 space-y-2">
            <label className="text-[10px] text-text-dim font-bold flex items-center gap-2 uppercase tracking-widest">
              <Percent size={12} className="text-accent" /> Duty Rate
            </label>
            <div className="relative">
              <select 
                value={selectedDuty}
                onChange={(e) => setSelectedDuty(e.target.value)}
                className="w-full bg-bg-primary border border-border-theme rounded-lg px-3 py-2 text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all appearance-none cursor-pointer"
              >
                {dutyRates.map(d => <option key={d} value={d} className="bg-bg-secondary">{d}</option>)}
              </select>
              <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-text-dim pointer-events-none" />
            </div>
          </div>

          {/* User Highlights List */}
          {userHighlights.length > 0 && (
            <div className="px-6 mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest">Saved Highlights</label>
                <button onClick={() => setUserHighlights([])} className="text-text-dim hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                {userHighlights.map(h => (
                  <div key={h.id} className="flex items-center gap-2 p-2 bg-bg-primary/50 rounded border border-border-theme group">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                    <span className="text-[10px] truncate flex-1">{h.text}</span>
                    <button 
                      onClick={() => setUserHighlights(prev => prev.filter(item => item.id !== h.id))}
                      className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-red-400 transition-all"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-border-theme">
          <div className="text-[10px] text-text-dim font-medium">System Version 4.2.0-HTS</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
        
        {/* Top Utility Bar */}
        <header className="flex items-center gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search HTS Code or Description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary border border-border-theme rounded-lg pl-11 pr-4 py-3 text-sm text-text-main outline-none focus:ring-1 focus:ring-accent transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              title="Reset Search and Filters"
              className="w-10 h-10 bg-bg-secondary border border-border-theme rounded-lg flex items-center justify-center text-text-dim hover:text-accent hover:border-accent transition-all group"
            >
              <RotateCcw size={18} className="group-active:rotate-[-180deg] transition-transform duration-300" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6">
          
          {/* Results Area */}
          <div className={cn(
            "flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6",
            viewMode === 'document' && "hidden lg:block"
          )}>
            
            {showHighlights ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="bg-bg-secondary border border-border-theme rounded-2xl p-8 space-y-6">
                  <div className="flex items-center gap-3 text-accent">
                    <BookOpen size={24} />
                    <h2 className="text-2xl font-bold tracking-tight">Key Highlights</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {keyHighlights.map((highlight, i) => (
                      <div key={i} className="space-y-3">
                        <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">{highlight.title}</h3>
                        <ul className="space-y-2">
                          {highlight.points.map((point, j) => (
                            <li key={j} className="text-sm text-text-dim flex gap-2">
                              <span className="text-accent mt-1">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-8 space-y-4">
                  <div className="flex items-center gap-3 text-accent">
                    <AlertCircle size={24} />
                    <h2 className="text-2xl font-bold tracking-tight">Action Required</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {actionRequired.map((action, i) => (
                      <div key={i} className="flex items-center gap-3 bg-bg-primary/50 p-4 rounded-xl border border-border-theme">
                        <CheckCircle2 size={18} className="text-accent shrink-0" />
                        <p className="text-sm font-medium text-text-dim">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <LayoutGrid size={20} className="text-accent" />
                    Search Results
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-bg-secondary border border-border-theme rounded-lg px-3 py-1.5">
                      <ArrowUpDown size={14} className="text-text-dim" />
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent outline-none text-xs font-medium cursor-pointer text-text-dim"
                      >
                        <option value="code">Sort: Code</option>
                        <option value="description">Sort: Description</option>
                      </select>
                    </div>
                    <span className="text-xs text-text-dim font-medium">{filteredData.length} items</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {filteredData.map((item, idx) => (
                      <motion.div
                        key={item.code + idx}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => handleCodeClick(item.code)}
                        className="bg-bg-secondary border border-border-theme rounded-xl overflow-hidden hover:border-accent transition-all shadow-sm group cursor-pointer"
                      >
                        <div className="p-5 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-text-dim font-bold uppercase tracking-widest">HTS Code:</span>
                                <span className="text-2xl font-bold text-accent tracking-tighter font-mono">
                                  {highlightText(item.code, searchQuery)}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={20} className="text-text-dim group-hover:text-accent transition-colors" />
                          </div>

                          <div className="space-y-4">
                            <div className="bg-bg-primary/50 p-4 rounded-lg border border-border-theme">
                              <span className="text-[10px] text-text-dim font-bold uppercase tracking-widest block mb-2">Description</span>
                              <p className="text-sm leading-relaxed text-text-main">
                                {highlightText(item.description, searchQuery)}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-bg-primary/30 p-3 rounded-lg border border-border-theme">
                                <span className="text-[10px] text-text-dim font-bold uppercase tracking-widest block mb-1">Annex Category</span>
                                <span className="text-xs font-bold text-text-main">{item.annex}</span>
                              </div>
                              <div className="bg-bg-primary/30 p-3 rounded-lg border border-border-theme">
                                <span className="text-[10px] text-text-dim font-bold uppercase tracking-widest block mb-1">Section 232 Duty Rate</span>
                                <span className="text-xs font-bold text-accent">{getDutyRate(item)}</span>
                              </div>
                              <div className="bg-bg-primary/30 p-3 rounded-lg border border-border-theme">
                                <span className="text-[10px] text-text-dim font-bold uppercase tracking-widest block mb-1">Additional HTS Tariff</span>
                                <span className="text-xs font-bold text-accent">{getAdditionalTariffCode(item)}</span>
                              </div>
                            </div>
                            
                            {(item.notes || !isCoreMetalChapter(item.code)) && (
                              <div className="bg-accent/5 p-4 rounded-lg border border-accent/20">
                                <div className="flex items-center gap-2 mb-2 text-accent">
                                  <Info size={14} />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Compliance Note</span>
                                </div>
                                <p className="text-xs text-text-main/80 leading-relaxed italic">{getComplianceNote(item)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {filteredData.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center text-text-dim space-y-4 opacity-50">
                      <Search size={48} />
                      <p className="text-sm font-medium">No HTS codes found matching your criteria</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Document Preview Pane */}
          <div className={cn(
            "flex-1 bg-white rounded-xl overflow-hidden flex flex-col relative shadow-2xl",
            viewMode === 'grid' && "hidden lg:flex"
          )}>
            <div className="p-8 border-b-2 border-slate-900 mx-8 mt-8 flex justify-between items-end text-slate-900 font-serif italic">
              <div className="flex items-center gap-4">
                <span className="text-xs uppercase tracking-widest font-bold">Official Tariff Schedule</span>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <Highlighter size={14} className="text-slate-500" />
                  {['#fbbf24', '#f87171', '#60a5fa', '#4ade80'].map(color => (
                    <button 
                      key={color}
                      onClick={() => setHighlighterColor(color)}
                      className={cn(
                        "w-4 h-4 rounded-full border border-white transition-transform",
                        highlighterColor === color ? "scale-125 shadow-sm" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <div className="w-px h-3 bg-slate-200 mx-1" />
                  <button 
                    onClick={() => setUserHighlights([])}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    title="Clear all highlights"
                  >
                    <Trash2 size={12} />
                    Clear
                  </button>
                </div>
              </div>
              <span className="text-sm">Section 232 Analysis</span>
            </div>
            
            <div 
              ref={docContainerRef}
              onMouseUp={handleTextSelection}
              className="flex-1 overflow-y-auto p-8 custom-scrollbar text-slate-800 relative select-text"
            >
              <div 
                className="document-view whitespace-pre-wrap leading-relaxed transition-all duration-200"
                style={{ fontSize: `${(zoom / 100) * 0.875}rem` }}
              >
                {documentText.split('\n').map((line, i) => renderDocumentLine(line, i))}
              </div>
            </div>

            {/* Tooltip */}
            {tooltip && (
              <div 
                className="fixed z-[100] bg-slate-900 text-white text-xs p-3 rounded-lg shadow-2xl border border-slate-700 max-w-sm pointer-events-none backdrop-blur-md bg-opacity-95"
                style={{ 
                  left: Math.min(tooltip.x + 20, window.innerWidth - 320), 
                  top: tooltip.y + 20 
                }}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-accent uppercase tracking-tighter text-[10px]">HTS Classification Info</span>
                  <p className="leading-relaxed">{tooltip.text}</p>
                </div>
              </div>
            )}

            {/* Zoom Overlay */}
            <div className="absolute bottom-6 right-6 bg-bg-primary/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-4 text-white text-[10px] font-bold uppercase tracking-wider border border-border-theme shadow-lg">
              <button onClick={handleZoomOut} className="hover:text-accent transition-colors"><ZoomOut size={14} /></button>
              <span className="w-10 text-center">{zoom}%</span>
              <button onClick={handleZoomIn} className="hover:text-accent transition-colors"><ZoomIn size={14} /></button>
              <div className="w-px h-3 bg-border-theme" />
              <button 
                onClick={() => setViewMode('grid')}
                className="hover:text-accent transition-colors lg:hidden"
              >
                Back to List
              </button>
              <button 
                onClick={() => setZoom(100)}
                className="hover:text-accent transition-colors hidden lg:block"
              >
                Reset Zoom
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-bg-secondary border border-border-theme rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border-theme flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-3xl font-bold text-accent tracking-tighter font-mono">{selectedItem.code}</h3>
                  <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest rounded border border-accent/20">
                    {selectedItem.annex}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-text-dim hover:text-text-main transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest">Description</label>
                  <p className="text-lg leading-relaxed text-text-main font-medium">{selectedItem.description}</p>
                </div>

                {selectedItem.subdivision && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest">Applicable Additional Tariffs</label>
                      <span className="text-[10px] px-2 py-0.5 bg-bg-primary border border-border-theme rounded text-text-dim font-mono">
                        Subdivision: {selectedItem.subdivision}
                      </span>
                    </div>
                    
                    <div className="overflow-hidden border border-border-theme rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-bg-primary border-b border-border-theme">
                            <th className="px-4 py-3 font-bold text-text-dim uppercase tracking-wider">Tariff Code</th>
                            <th className="px-4 py-3 font-bold text-text-dim uppercase tracking-wider">Rate</th>
                            <th className="px-4 py-3 font-bold text-text-dim uppercase tracking-wider">Condition/Rule</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-theme">
                          {getTariffsForSubdivision(selectedItem.subdivision).map((rule) => (
                            <tr key={rule.code} className="hover:bg-accent/5 transition-colors">
                              <td className="px-4 py-4 font-mono font-bold text-accent">{rule.code}</td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 bg-accent/10 text-accent rounded font-bold">{rule.rate}</span>
                              </td>
                              <td className="px-4 py-4 text-text-dim leading-relaxed">
                                {rule.description}
                              </td>
                            </tr>
                          ))}
                          {getTariffsForSubdivision(selectedItem.subdivision).length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-text-dim italic">
                                No specific additional tariffs found for this subdivision in the current rule set.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {(selectedItem.notes || !isCoreMetalChapter(selectedItem.code)) && (
                      <div className="bg-accent/5 p-4 rounded-xl border border-accent/20">
                        <div className="flex items-center gap-2 mb-2 text-accent">
                          <Info size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Compliance Note</span>
                        </div>
                        <p className="text-sm text-text-main/90 leading-relaxed italic">{getComplianceNote(selectedItem)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-bg-primary/50 p-6 rounded-2xl border border-border-theme space-y-4">
                    <div className="flex items-center gap-2 text-accent">
                      <Info size={18} />
                      <label className="text-[10px] font-bold uppercase tracking-widest">Classification</label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-text-main">{selectedItem.category || 'Uncategorized'}</p>
                        <p className="text-xs text-text-dim">Material Category</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-text-main">Page {selectedItem.page}</p>
                        <p className="text-xs text-text-dim">Document Page Reference</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedItem.notes && (
                  <div className="bg-accent/5 p-6 rounded-2xl border border-accent/20 space-y-3">
                    <div className="flex items-center gap-2 text-accent">
                      <AlertCircle size={18} />
                      <label className="text-[10px] font-bold uppercase tracking-widest">Important Notes</label>
                    </div>
                    <p className="text-sm text-accent/80 leading-relaxed italic">{selectedItem.notes}</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border-theme bg-bg-primary/30 flex justify-end">
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="px-6 py-2 bg-accent text-bg-primary font-bold text-sm rounded-lg hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
