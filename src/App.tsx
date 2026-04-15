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
  Percent,
  MessageSquare,
  Edit3,
  StickyNote,
  Database
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
  annotation?: string;
  createdAt: number;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedAnnex, setSelectedAnnex] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'code' | 'description'>('code');
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'grid' | 'document'>('grid');
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'dashboard' | 'master-data' | 'key-highlights' | 'my-highlights'>('dashboard');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<HTSItem | null>(null);
  const [userHighlights, setUserHighlights] = useState<UserHighlight[]>(() => {
    const saved = localStorage.getItem('hts_user_highlights');
    return saved ? JSON.parse(saved) : [];
  });
  const [highlighterColor, setHighlighterColor] = useState('#fbbf24'); // Default yellow
  const [isHighlighterMode, setIsHighlighterMode] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<UserHighlight | null>(null);
  const [highlightFilter, setHighlightFilter] = useState<string>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  
  const docContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Auto-save highlights every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('hts_user_highlights', JSON.stringify(userHighlights));
      console.log('Auto-saved highlights');
    }, 30000);
    return () => clearInterval(interval);
  }, [userHighlights]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom: Ctrl/Cmd + +/-
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }

      // Highlighter Mode: H (if not typing in input)
      if (e.key.toLowerCase() === 'h' && !(e.target instanceof HTMLInputElement)) {
        setIsHighlighterMode(prev => !prev);
      }

      // Sidebar Tabs: Ctrl/Cmd + 1-4
      if ((e.ctrlKey || e.metaKey) && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const tabs: ('dashboard' | 'master-data' | 'key-highlights' | 'my-highlights')[] = ['dashboard', 'master-data', 'key-highlights', 'my-highlights'];
        setSidebarTab(tabs[parseInt(e.key) - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, sidebarTab]);

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
        <div key={i} className="grid grid-cols-4 md:grid-cols-6 gap-2 py-3 px-4 bg-slate-50 rounded-lg my-1 border border-slate-200">
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
          ref={el => { lineRefs.current[i] = el; }}
          onMouseMove={(e) => handleDocHover(e, line)}
          onMouseLeave={() => setTooltip(null)}
          onClick={() => handleCodeClick(code)}
          className={cn(
            "grid grid-cols-[120px_1fr] gap-4 py-2 px-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group",
            isHighlighted && "bg-accent/10 border-l-4 border-accent -mx-4"
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
          ref={el => { lineRefs.current[i] = el; }}
          className="mt-8 mb-4 px-4 py-3 bg-slate-900 text-white rounded-lg font-bold uppercase tracking-widest text-[10px] shadow-sm"
        >
          {line}
        </div>
      );
    }

    return (
      <div 
        key={i} 
        ref={el => { lineRefs.current[i] = el; }}
        onMouseMove={(e) => handleDocHover(e, line)}
        onMouseLeave={() => setTooltip(null)}
        className={cn(
          "py-2 px-4 text-slate-700 leading-relaxed text-sm transition-colors",
          isHighlighted && "bg-accent/10 border-l-4 border-accent -mx-4"
        )}
      >
        {highlightText(line, highlightedCode || '', true)}
      </div>
    );
  };

  const filteredData = useMemo(() => {
    // If in dashboard, only show results if searching
    if (sidebarTab === 'dashboard' && !searchQuery.trim()) return [];

    return htsData
      .filter(item => {
        const query = searchQuery.toLowerCase().replace(/\./g, '');
        const itemCode = item.code.replace(/\./g, '');
        const matchesSearch = 
          itemCode.includes(query) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAnnex = sidebarTab === 'dashboard' || selectedAnnex === 'All' || item.annex === selectedAnnex;
        const matchesCategory = sidebarTab === 'dashboard' || selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesAnnex && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'code') return a.code.localeCompare(b.code);
        return a.description.localeCompare(b.description);
      });
  }, [searchQuery, selectedAnnex, selectedCategory, sortBy, sidebarTab]);

  const handleReset = () => {
    setSearchQuery('');
    setSelectedAnnex('All');
    setSelectedCategory('All');
    setSortBy('code');
    setHighlightedCode(null);
    setSidebarTab('dashboard');
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
        const newHighlight: UserHighlight = {
          id: Math.random().toString(36).substr(2, 9),
          text,
          color: highlighterColor,
          createdAt: Date.now()
        };
        setUserHighlights(prev => [...prev, newHighlight]);
        setEditingHighlight(newHighlight);
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
              <span key={i} className="relative group/highlight inline">
                <mark 
                  style={{ backgroundColor: userH.color }}
                  className="rounded-sm px-0.5 text-slate-900 cursor-help"
                >
                  {part}
                </mark>
                {userH.annotation && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[10px] p-2 rounded shadow-xl opacity-0 group-hover/highlight:opacity-100 transition-opacity pointer-events-none z-50">
                    <div className="flex items-center gap-1 mb-1 text-accent font-bold uppercase tracking-tighter">
                      <StickyNote size={10} /> Note
                    </div>
                    {userH.annotation}
                  </div>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingHighlight(userH); }}
                  className="absolute -top-2 -right-2 w-4 h-4 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-accent opacity-0 group-hover/highlight:opacity-100 transition-all shadow-sm z-10"
                >
                  <Edit3 size={8} />
                </button>
              </span>
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
    if (isHighlighterMode) {
      if (!userHighlights.some(h => h.text === code)) {
        const newHighlight: UserHighlight = {
          id: Math.random().toString(36).substr(2, 9),
          text: code,
          color: highlighterColor,
          createdAt: Date.now()
        };
        setUserHighlights(prev => [...prev, newHighlight]);
        setEditingHighlight(newHighlight);
      }
      return;
    }
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
            onClick={() => { setSidebarTab('dashboard'); setHighlightedCode(null); }}
            className={cn(
              "w-full px-6 py-3 text-sm flex items-center gap-3 transition-all",
              sidebarTab === 'dashboard' ? "text-text-main bg-white/5 border-l-4 border-accent" : "text-text-dim hover:text-text-main hover:bg-white/5"
            )}
          >
            <LayoutGrid size={18} />
            Dashboard
          </button>

          <button 
            onClick={() => { setSidebarTab('master-data'); setHighlightedCode(null); }}
            className={cn(
              "w-full px-6 py-3 text-sm flex items-center gap-3 transition-all",
              sidebarTab === 'master-data' ? "text-text-main bg-white/5 border-l-4 border-accent" : "text-text-dim hover:text-text-main hover:bg-white/5"
            )}
          >
            <Database size={18} />
            Master Data
          </button>
          
          <button 
            onClick={() => setSidebarTab('key-highlights')}
            className={cn(
              "w-full px-6 py-3 text-sm flex items-center gap-3 transition-all",
              sidebarTab === 'key-highlights' ? "text-text-main bg-white/5 border-l-4 border-accent" : "text-text-dim hover:text-text-main hover:bg-white/5"
            )}
          >
            <BookOpen size={18} />
            Key Highlights
          </button>

          <button 
            onClick={() => setSidebarTab('my-highlights')}
            className={cn(
              "w-full px-6 py-3 text-sm flex items-center gap-3 transition-all",
              sidebarTab === 'my-highlights' ? "text-text-main bg-white/5 border-l-4 border-accent" : "text-text-dim hover:text-text-main hover:bg-white/5"
            )}
          >
            <Highlighter size={18} />
            My Highlights
          </button>

          {sidebarTab === 'master-data' && (
            <>
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
            </>
          )}

          {sidebarTab === 'my-highlights' && (
            <div className="px-6 mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest">Manage Highlights</label>
                {showClearAllConfirm ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setUserHighlights([]); setShowClearAllConfirm(false); }}
                      className="text-[8px] font-bold text-red-400 hover:underline"
                    >
                      CONFIRM CLEAR
                    </button>
                    <button 
                      onClick={() => setShowClearAllConfirm(false)}
                      className="text-[8px] font-bold text-text-dim hover:underline"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowClearAllConfirm(true)} className="text-text-dim hover:text-red-400 transition-colors" title="Clear All">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest">Filter by Color</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setHighlightFilter('All')}
                    className={cn(
                      "w-6 h-6 rounded-full border border-border-theme flex items-center justify-center text-[8px] font-bold",
                      highlightFilter === 'All' ? "bg-accent text-bg-primary" : "bg-white/5 text-text-dim"
                    )}
                  >
                    ALL
                  </button>
                  {['#fbbf24', '#f87171', '#60a5fa', '#4ade80'].map(color => (
                    <button 
                      key={color}
                      onClick={() => setHighlightFilter(color)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        highlightFilter === color ? "border-white scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {userHighlights
                  .filter(h => highlightFilter === 'All' || h.color === highlightFilter)
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map(h => (
                    <div key={h.id} className="p-3 bg-bg-primary/50 rounded-xl border border-border-theme group space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                        <span className="text-[10px] font-mono text-text-dim">ID: {h.id}</span>
                        <div className="flex-1" />
                        <button 
                          onClick={() => setEditingHighlight(h)}
                          className="text-text-dim hover:text-accent transition-colors"
                        >
                          <Edit3 size={12} />
                        </button>
                        {confirmDeleteId === h.id ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => { setUserHighlights(prev => prev.filter(item => item.id !== h.id)); setConfirmDeleteId(null); }}
                              className="text-[8px] font-bold text-red-400"
                            >
                              YES
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[8px] font-bold text-text-dim"
                            >
                              NO
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(h.id)}
                            className="text-text-dim hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-text-main leading-relaxed italic">"{h.text}"</p>
                      {h.annotation && (
                        <div className="bg-accent/5 p-2 rounded border border-accent/10 flex gap-2">
                          <MessageSquare size={10} className="text-accent shrink-0 mt-0.5" />
                          <p className="text-[10px] text-text-dim">{h.annotation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                {userHighlights.length === 0 && (
                  <div className="text-center py-8 text-text-dim opacity-50">
                    <Highlighter size={24} className="mx-auto mb-2" />
                    <p className="text-[10px]">No highlights yet.<br/>Select text in document to add.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-border-theme space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[10px] text-text-dim font-medium uppercase tracking-widest">System Version</div>
              <div className="text-xs font-bold">4.2.0-HTS</div>
              <div className="text-[10px] text-accent font-bold">Powered by JUNAID ABBASI</div>
            </div>
            <button 
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-xl bg-bg-primary border border-border-theme flex items-center justify-center text-text-dim hover:text-accent transition-all hover:scale-110"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
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
            "overflow-y-auto custom-scrollbar pr-2 space-y-6 transition-all duration-500",
            (sidebarTab === 'key-highlights' || sidebarTab === 'master-data') ? "flex-1" : "lg:w-1/2",
            viewMode === 'document' && "hidden lg:block"
          )}>
            
            {sidebarTab === 'key-highlights' ? (
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
                {sidebarTab === 'dashboard' && !searchQuery.trim() && (
                  <div className="h-full flex flex-col items-center justify-center text-text-dim opacity-30 space-y-4">
                    <Search size={64} strokeWidth={1} />
                    <p className="text-sm font-medium uppercase tracking-widest">Enter search query to view results</p>
                  </div>
                )}
                
                {(sidebarTab === 'master-data' || (sidebarTab === 'dashboard' && searchQuery.trim())) && (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        {sidebarTab === 'master-data' ? <Database size={20} className="text-accent" /> : <LayoutGrid size={20} className="text-accent" />}
                        {sidebarTab === 'master-data' ? 'Master Data' : 'Search Results'}
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
          </>
        )}
      </div>

          {/* Document Preview Pane */}
          {sidebarTab !== 'key-highlights' && sidebarTab !== 'master-data' && (
            <div className={cn(
              "flex-1 bg-white rounded-xl overflow-hidden flex flex-col relative shadow-2xl border border-slate-300",
              viewMode === 'grid' && "hidden lg:flex",
              isHighlighterMode && "cursor-pen"
            )}>
              <div className="p-8 border-b-2 border-slate-200 mx-8 mt-8 flex justify-between items-end text-slate-900 font-serif italic">
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-widest font-bold text-slate-500">Official Tariff Schedule</span>
                  <div className={cn(
                    "flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 transition-all duration-300",
                    isHighlighterMode ? "p-3 gap-4 scale-110 shadow-[0_0_25px_rgba(0,0,0,0.1)] border-accent ring-4 ring-accent/10" : ""
                  )}>
                    <button 
                      onClick={() => setIsHighlighterMode(!isHighlighterMode)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        isHighlighterMode ? "text-accent bg-accent/10 scale-110" : "text-text-dim hover:bg-white/5"
                      )}
                      title={isHighlighterMode ? "Disable Highlighter Mode" : "Enable Highlighter Mode"}
                    >
                      <Highlighter size={16} />
                    </button>
                    <div className="w-px h-4 bg-border-theme mx-1" />
                    {['#fbbf24', '#f87171', '#60a5fa', '#4ade80'].map(color => (
                      <button 
                        key={color}
                        onClick={() => {
                          setHighlighterColor(color);
                          setIsHighlighterMode(true);
                        }}
                        className={cn(
                          "rounded-full border-2 border-white transition-all",
                          isHighlighterMode ? "w-6 h-6" : "w-4 h-4",
                          highlighterColor === color && isHighlighterMode ? "scale-125 shadow-md ring-2 ring-accent ring-offset-2 ring-offset-bg-primary" : "hover:scale-110 opacity-70 hover:opacity-100"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="relative group/color">
                      <input 
                        type="color" 
                        value={highlighterColor}
                        onChange={(e) => {
                          setHighlighterColor(e.target.value);
                          setIsHighlighterMode(true);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className={cn(
                        "rounded-full border-2 border-white transition-all flex items-center justify-center overflow-hidden",
                        isHighlighterMode ? "w-6 h-6" : "w-4 h-4",
                        !['#fbbf24', '#f87171', '#60a5fa', '#4ade80'].includes(highlighterColor) && isHighlighterMode ? "scale-125 shadow-md ring-2 ring-accent ring-offset-2 ring-offset-bg-primary" : "hover:scale-110 opacity-70 hover:opacity-100"
                      )} style={{ backgroundColor: highlighterColor }}>
                        <span className="text-[8px] text-white mix-blend-difference font-bold">+</span>
                      </div>
                    </div>
                    <div className="w-px h-4 bg-border-theme mx-1" />
                    <button 
                      onClick={() => setUserHighlights([])}
                      className="text-[10px] text-text-dim hover:text-red-500 transition-colors flex items-center gap-1 px-2 py-1 hover:bg-red-500/5 rounded"
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
                className="flex-1 overflow-y-auto p-8 custom-scrollbar text-text-main relative select-text"
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
          )}
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

      {/* Annotation Modal */}
      <AnimatePresence>
        {editingHighlight && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingHighlight(null)}
              className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-secondary border border-border-theme rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Edit3 size={18} className="text-accent" />
                  Edit Highlight
                </h3>
                <button onClick={() => setEditingHighlight(null)} className="text-text-dim hover:text-text-main">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-bg-primary rounded-lg border border-border-theme">
                  <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest block mb-2">Selected Text</label>
                  <p className="text-xs italic text-text-main leading-relaxed">"{editingHighlight.text}"</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest block">Highlight Color</label>
                  <div className="flex gap-3">
                    {['#fbbf24', '#f87171', '#60a5fa', '#4ade80'].map(color => (
                      <button 
                        key={color}
                        onClick={() => setEditingHighlight(prev => prev ? { ...prev, color } : null)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          editingHighlight.color === color ? "border-white scale-110 shadow-lg" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-text-dim font-bold uppercase tracking-widest block">Annotation / Note</label>
                  <textarea 
                    value={editingHighlight.annotation || ''}
                    onChange={(e) => setEditingHighlight(prev => prev ? { ...prev, annotation: e.target.value } : null)}
                    placeholder="Add a detailed note or annotation to this highlight..."
                    className="w-full bg-bg-primary border border-border-theme rounded-xl p-5 text-sm outline-none focus:ring-2 focus:ring-accent min-h-[200px] resize-none shadow-inner transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {confirmDeleteId === editingHighlight.id ? (
                  <div className="flex-1 flex gap-2">
                    <button 
                      onClick={() => {
                        setUserHighlights(prev => prev.filter(h => h.id !== editingHighlight.id));
                        setEditingHighlight(null);
                        setConfirmDeleteId(null);
                      }}
                      className="flex-1 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all"
                    >
                      CONFIRM DELETE
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 px-4 py-2 bg-bg-primary border border-border-theme text-text-dim text-xs font-bold rounded-lg hover:text-text-main transition-all"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmDeleteId(editingHighlight.id)}
                    className="flex-1 px-4 py-2 border border-red-500/30 text-red-400 text-sm font-bold rounded-lg hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <button 
                  onClick={() => {
                    setUserHighlights(prev => prev.map(h => h.id === editingHighlight.id ? editingHighlight : h));
                    setEditingHighlight(null);
                  }}
                  className="flex-[2] px-4 py-2 bg-accent text-bg-primary text-sm font-bold rounded-lg hover:shadow-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
