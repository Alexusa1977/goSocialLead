import React, { useState, useEffect, useCallback } from 'react';
import { Keyword, Folder, Lead, Stats, Platform } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import LeadList from './components/LeadList.tsx';
import KeywordManager from './components/KeywordManager.tsx';
import { discoverNewLeads } from './services/geminiService.ts';

// Robust check for API key presence in environment, supporting both standard and custom names
const getEnvKey = () => {
  const key = process.env.API_KEY || (process.env as any).Google_Gemini_API;
  if (!key || key === 'undefined' || key === 'null' || key === '' || key.includes('YOUR_API_KEY')) {
    return null;
  }
  return key;
};

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'leads' | 'keywords' | 'settings'>('dashboard');
  const [needsApiKey, setNeedsApiKey] = useState(!getEnvKey());
  
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('sociallead_folders');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'General Leads', createdAt: Date.now() }];
  });

  const [keywords, setKeywords] = useState<Keyword[]>(() => {
    const saved = localStorage.getItem('sociallead_keywords');
    return saved ? JSON.parse(saved) : [];
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('sociallead_leads');
    return saved ? JSON.parse(saved) : [];
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('sociallead_settings');
    return saved ? JSON.parse(saved) : { autoScan: true, emailNotifications: false };
  });

  // Re-check API key status periodically
  useEffect(() => {
    const checkStatus = async () => {
      const envKey = getEnvKey();
      if (envKey) {
        setNeedsApiKey(false);
        return;
      }

      if (window.aistudio) {
        try {
          const hasStudioKey = await window.aistudio.hasSelectedApiKey();
          if (hasStudioKey) setNeedsApiKey(false);
        } catch (e) {
          console.warn("Key check failed", e);
        }
      }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('sociallead_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('sociallead_keywords', JSON.stringify(keywords));
  }, [keywords]);

  useEffect(() => {
    localStorage.setItem('sociallead_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('sociallead_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setNeedsApiKey(false);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    } else {
      alert("No key tool detected. If you just set up Vercel, please wait 60 seconds and refresh your page.");
    }
  };

  const handleAddFolder = (name: string) => {
    const newFolder: Folder = { id: Math.random().toString(36).substr(2, 9), name, createdAt: Date.now() };
    setFolders(prev => [...prev, newFolder]);
  };

  const handleRemoveFolder = (id: string) => {
    if (folders.length <= 1) return alert("You must have at least one folder.");
    setFolders(prev => prev.filter(f => f.id !== id));
    setKeywords(prev => prev.filter(k => k.folderId !== id));
  };

  const handleAddKeyword = (folderId: string, term: string, location?: string) => {
    const newKw: Keyword = {
      id: Math.random().toString(36).substr(2, 9),
      folderId,
      term,
      location,
      active: true,
      createdAt: Date.now()
    };
    setKeywords(prev => [...prev, newKw]);
  };

  const handleRemoveKeyword = (id: string) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
  };

  const handleToggleKeyword = (id: string) => {
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, active: !k.active } : k));
  };

  const handleUpdateLeadStatus = (id: string, status: Lead['status']) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const refreshLeads = useCallback(async () => {
    const activeKeywordConfigs = keywords
      .filter(k => k.active)
      .map(k => ({ term: k.term, location: k.location }));

    if (activeKeywordConfigs.length === 0) {
      alert("Add and enable keywords first!");
      setView('keywords');
      return;
    }

    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const results = await discoverNewLeads(activeKeywordConfigs);
      if (results && results.length > 0) {
        const newLeads: Lead[] = results.map((r, i) => ({
          ...r as any,
          id: `lead-${Date.now()}-${i}`,
          keywordId: 'ai-discovery',
          timestamp: Date.now(),
          status: 'new'
        }));
        setLeads(prev => [...newLeads, ...prev].slice(0, 500));
        if (view !== 'leads') setView('leads');
      } else {
        alert("Scan finished. No matching leads.");
      }
    } catch (err: any) {
      alert(`Discovery failed: ${err?.message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [keywords, isRefreshing, view]);

  const stats: Stats = {
    totalLeads: leads.length,
    activeKeywords: keywords.filter(k => k.active).length,
    highIntentCount: leads.filter(l => l.intentScore > 80).length,
    platforms: leads.reduce((acc, lead) => {
      acc[lead.platform] = (acc[lead.platform] || 0) + 1;
      return acc;
    }, {} as Record<Platform, number>)
  };

  if (needsApiKey && !getEnvKey()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">API Key Required</h2>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            The app cannot detect your API key. To fix this, rename your Vercel variable to <b className="text-indigo-600">API_KEY</b>.
          </p>
          
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-sm mb-6 text-left">
            <p className="font-bold mb-1">Status: Waiting for Key</p>
            <p className="text-xs">If you just updated Vercel, it takes up to 60 seconds for the change to appear in the browser.</p>
          </div>

          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
            Need help? <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-500 border-b-2 border-indigo-100">View Documentation</a>
          </p>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-[10px] text-slate-400 text-left">
            <p className="font-bold mb-1 uppercase">Diagnostics:</p>
            <ul className="space-y-1">
              <li>API_KEY: <span className={process.env.API_KEY ? 'text-emerald-500' : 'text-red-400'}>{process.env.API_KEY ? '✅ FOUND' : '❌ NOT FOUND'}</span></li>
              <li>Google_Gemini_API: <span className={(process.env as any).Google_Gemini_API ? 'text-emerald-500' : 'text-red-400'}>{(process.env as any).Google_Gemini_API ? '✅ FOUND' : '❌ NOT FOUND'}</span></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100">
      <Sidebar 
        currentView={view} 
        onNavigate={setView} 
        onScan={refreshLeads} 
        isScanning={isRefreshing}
        hasKeywords={keywords.some(k => k.active)}
      />
      <main className="md:ml-64 p-4 md:p-10">
        <div className="max-w-7xl mx-auto">
          {view === 'dashboard' && <Dashboard stats={stats} />}
          {view === 'leads' && <LeadList leads={leads} onUpdateStatus={handleUpdateLeadStatus} onRefresh={refreshLeads} keywords={keywords.map(k => k.term)} />}
          {view === 'keywords' && <KeywordManager folders={folders} keywords={keywords} onAddFolder={handleAddFolder} onRemoveFolder={handleRemoveFolder} onAddKeyword={handleAddKeyword} onRemoveKeyword={handleRemoveKeyword} onToggleKeyword={handleToggleKeyword} onScan={refreshLeads} />}
          {view === 'settings' && (
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm max-w-2xl">
              <h2 className="text-3xl font-black mb-8 tracking-tight">System Configuration</h2>
              <div className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">Auto-Scan Engine</p>
                    <p className="text-sm text-slate-500 font-medium italic">Scans every 60 minutes.</p>
                  </div>
                  <button onClick={() => setSettings({ ...settings, autoScan: !settings.autoScan })} className={`w-14 h-8 rounded-full transition-all relative ${settings.autoScan ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${settings.autoScan ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="pt-8 border-t border-slate-100">
                   <p className="font-bold text-slate-800 mb-2">Active Connection</p>
                   <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Secure Environment Key Linked</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;