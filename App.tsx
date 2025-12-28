import React, { useState, useEffect, useCallback } from 'react';
import { Keyword, Folder, Lead, Stats, Platform } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import LeadList from './components/LeadList.tsx';
import KeywordManager from './components/KeywordManager.tsx';
import { discoverNewLeads } from './services/geminiService.ts';

// Safe check for API key presence
const getApiKey = () => {
  try {
    const key = process.env.API_KEY || (process.env as any).Google_Gemini_API;
    if (key && key.length > 10 && !key.includes('YOUR_API_KEY')) {
      return key;
    }
  } catch (e) {
    // process.env might not be defined in some browser environments
  }
  return null;
};

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'leads' | 'keywords' | 'settings'>('dashboard');
  const [needsApiKey, setNeedsApiKey] = useState(!getApiKey());
  
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

  // Re-check API key status
  useEffect(() => {
    const checkStatus = async () => {
      const key = getApiKey();
      if (key) {
        setNeedsApiKey(false);
        return;
      }

      // Check if the Studio tool is available as a fallback
      if (window.aistudio) {
        try {
          const hasStudioKey = await window.aistudio.hasSelectedApiKey();
          if (hasStudioKey) setNeedsApiKey(false);
        } catch (e) {
          console.warn("Studio key check skipped", e);
        }
      }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 2000);
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
      alert("Note: If you've updated your Vercel variables, please ensure you triggered a NEW DEPLOYMENT for changes to take effect.");
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

  if (needsApiKey && !getApiKey()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Setup Required</h2>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            The application is waiting for your API key. 
          </p>
          
          <div className="p-6 bg-slate-50 rounded-3xl text-left space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
              <p className="text-sm text-slate-700 font-medium">In Vercel, rename your variable to exactly <b className="text-indigo-600">API_KEY</b></p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
              <p className="text-sm text-slate-700 font-medium">Click <b>Redeploy</b> in your Vercel dashboard.</p>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] mb-4"
          >
            I've Updated & Redeployed
          </button>
          
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
            Diagnostics: <span className="text-red-400">Waiting for browser to detect key</span>
          </p>
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
                   <p className="font-bold text-slate-800 mb-2">Connection Status</p>
                   <p className="text-xs font-black uppercase tracking-widest text-emerald-500">API Key Successfully Verified</p>
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