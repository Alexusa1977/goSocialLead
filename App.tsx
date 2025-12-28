import React, { useState, useEffect, useCallback } from 'react';
import { Keyword, Folder, Lead, Stats, Platform } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import LeadList from './components/LeadList.tsx';
import KeywordManager from './components/KeywordManager.tsx';
import { discoverNewLeads } from './services/geminiService.ts';

// Safe check for API key presence
const checkApiKey = () => {
  if (typeof process !== 'undefined' && process.env) {
    const key = process.env.API_KEY || (process.env as any).Google_Gemini_API;
    return (key && key !== 'undefined' && key.length > 5);
  }
  return false;
};

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'leads' | 'keywords' | 'settings'>('dashboard');
  const [hasValidKey, setHasValidKey] = useState(checkApiKey());
  
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

  // Background key check
  useEffect(() => {
    const interval = setInterval(() => {
      setHasValidKey(checkApiKey());
    }, 2000);
    return () => clearInterval(interval);
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
    if (!checkApiKey()) {
      alert("Missing API Key! Please check your Vercel Environment Variables. Ensure 'API_KEY' is set and your site is redeployed.");
      return;
    }

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
          {!hasValidKey && (
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl flex items-start space-x-4">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-amber-900">API Key Connection Pending</p>
                <p className="text-sm text-amber-800 mb-4 leading-relaxed">
                  Your API Key wasn't detected. If you just updated Vercel, please <b>Redeploy</b> your site for changes to take effect.
                </p>
                <div className="flex space-x-4">
                  <button onClick={() => window.location.reload()} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors">
                    Check Connection Again
                  </button>
                  <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-50 transition-colors">
                    Go to Vercel Dashboard
                  </a>
                </div>
              </div>
            </div>
          )}

          {view === 'dashboard' && <Dashboard stats={stats} />}
          {view === 'leads' && <LeadList leads={leads} onUpdateStatus={handleUpdateLeadStatus} onRefresh={refreshLeads} keywords={keywords.map(k => k.term)} />}
          {view === 'keywords' && <KeywordManager folders={folders} keywords={keywords} onAddFolder={handleAddFolder} onRemoveFolder={handleRemoveFolder} onAddKeyword={handleAddKeyword} onRemoveKeyword={handleRemoveKeyword} onToggleKeyword={handleToggleKeyword} onScan={refreshLeads} />}
          {view === 'settings' && (
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm max-w-2xl">
              <h2 className="text-3xl font-black mb-8 tracking-tight text-slate-900">System Configuration</h2>
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
                   {hasValidKey ? (
                     <p className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center">
                       <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                       API Key Successfully Linked
                     </p>
                   ) : (
                     <div className="space-y-4">
                       <p className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center">
                         <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                         API Key Missing
                       </p>
                       <div className="text-[11px] text-slate-500 bg-slate-50 p-4 rounded-xl font-mono">
                         <p className="font-bold mb-1">Troubleshooting:</p>
                         <ul className="list-disc ml-4 space-y-1">
                           <li>Rename variable to <b>API_KEY</b> in Vercel.</li>
                           <li><b>Redeploy</b> the project (Required).</li>
                           <li>Refresh this page.</li>
                         </ul>
                       </div>
                     </div>
                   )}
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