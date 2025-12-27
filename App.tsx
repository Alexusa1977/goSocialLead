
import React, { useState, useEffect, useCallback } from 'react';
import { Keyword, Folder, Lead, Stats, Platform } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import LeadList from './components/LeadList.tsx';
import KeywordManager from './components/KeywordManager.tsx';
import { discoverNewLeads } from './services/geminiService.ts';

// Extension for window object to support Veo and image generation key selection
declare global {
  /* Fix: Use the global AIStudio type to resolve the property type conflict */
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'leads' | 'keywords' | 'settings'>('dashboard');
  const [needsApiKey, setNeedsApiKey] = useState(false);
  
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

  /* Fix: Check for API Key on mount as required for premium models like Veo */
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey && !process.env.API_KEY) {
          setNeedsApiKey(true);
        }
      }
    };
    checkApiKey();
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
      await window.aistudio.openSelectKey();
      /* Assume selection was successful to avoid race conditions */
      setNeedsApiKey(false);
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
      alert("Please add and enable some keywords in the Keywords tab first!");
      return;
    }

    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const results = await discoverNewLeads(activeKeywordConfigs);
      
      if (results && results.length > 0) {
        const newLeads: Lead[] = results.map((r, i) => ({
          ...r as any,
          id: `lead-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          keywordId: 'ai-discovery',
          timestamp: Date.now() - (i * 300000),
          status: 'new'
        }));
        
        setLeads(prev => {
          const existingContent = new Set(prev.map(l => l.content));
          const uniqueNew = newLeads.filter(l => !existingContent.has(l.content));
          return [...uniqueNew, ...prev].slice(0, 500); 
        });
        
        if (view !== 'leads') setView('leads');
      } else {
        alert("The scan completed but no new leads were found for your current keywords.");
      }
    } catch (err: any) {
      console.error("Discovery error details:", err);
      /* Reset key selection state if error indicates missing resource or key */
      if (err?.message?.includes("entity was not found") || err?.message?.includes("API Key")) {
        setNeedsApiKey(true);
      }
      const errorMessage = err?.message || "Internal API Error";
      alert(`Lead discovery failed: ${errorMessage}. Please ensure your API key is active and connected to a paid GCP project.`);
    } finally {
      setIsRefreshing(false);
    }
  }, [keywords, isRefreshing, view]);

  useEffect(() => {
    if (!settings.autoScan) return;
    const intervalId = setInterval(() => {
      refreshLeads();
    }, 3600000);
    return () => clearInterval(intervalId);
  }, [settings.autoScan, refreshLeads]);

  /* Fix: Calculate stats required for the Dashboard view */
  const stats: Stats = {
    totalLeads: leads.length,
    activeKeywords: keywords.filter(k => k.active).length,
    highIntentCount: leads.filter(l => l.intentScore > 80).length,
    platforms: leads.reduce((acc, lead) => {
      acc[lead.platform] = (acc[lead.platform] || 0) + 1;
      return acc;
    }, {} as Record<Platform, number>)
  };

  if (needsApiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">API Key Required</h2>
          <p className="text-slate-500 mb-8">To scan social media and analyze leads, you need to connect your Google Gemini API key from a paid project.</p>
          <button 
            onClick={handleSelectKey}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            Select API Key
          </button>
          <p className="mt-4 text-xs text-slate-400">
            Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-500 underline">billing requirements</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar 
        currentView={view} 
        onNavigate={setView} 
        onScan={refreshLeads} 
        isScanning={isRefreshing}
        hasKeywords={keywords.some(k => k.active)}
      />
      
      <main className="md:ml-64 p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {view === 'dashboard' && <Dashboard stats={stats} />}
          {view === 'leads' && (
            <LeadList 
              leads={leads} 
              onUpdateStatus={handleUpdateLeadStatus} 
              onRefresh={refreshLeads}
              keywords={keywords.map(k => k.term)}
            />
          )}
          {view === 'keywords' && (
            <KeywordManager 
              folders={folders}
              keywords={keywords}
              onAddFolder={handleAddFolder}
              onRemoveFolder={handleRemoveFolder}
              onAddKeyword={handleAddKeyword}
              onRemoveKeyword={handleRemoveKeyword}
              onToggleKeyword={handleToggleKeyword}
              onScan={refreshLeads}
            />
          )}
          {view === 'settings' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm max-w-2xl">
              <h2 className="text-2xl font-bold mb-6">Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">Auto-Scan Socials</p>
                    <p className="text-sm text-slate-500">Automatically look for new leads every hour.</p>
                  </div>
                  <button 
                    onClick={() => setSettings({ ...settings, autoScan: !settings.autoScan })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoScan ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoScan ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="pt-6 border-t border-slate-50">
                   <button 
                    onClick={handleSelectKey}
                    className="text-indigo-600 font-bold text-sm hover:underline"
                   >
                     Change API Key 🔐
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

/* Fix: Export the App component as default to resolve the module resolution error in index.tsx */
export default App;
