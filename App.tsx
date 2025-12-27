
import React, { useState, useEffect, useCallback } from 'react';
import { Keyword, Folder, Lead, Stats, Platform } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import LeadList from './components/LeadList.tsx';
import KeywordManager from './components/KeywordManager.tsx';
import { discoverNewLeads } from './services/geminiService.ts';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'leads' | 'keywords' | 'settings'>('dashboard');
  
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
      const errorMessage = err?.message || "Internal API Error";
      alert(`Lead discovery failed: ${errorMessage}. Please check your internet connection or ensure your keywords are not too restrictive.`);
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

  const stats: Stats = {
    totalLeads: leads.length,
    activeKeywords: keywords.filter(k => k.active).length,
    highIntentCount: leads.filter(l => l.intentScore > 80).length,
    platforms: leads.reduce((acc, l) => {
      acc[l.platform] = (acc[l.platform] || 0) + 1;
      return acc;
    }, {} as Record<Platform, number>)
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <Sidebar 
        currentView={view} 
        onNavigate={setView} 
        onScan={refreshLeads}
        isScanning={isRefreshing}
        hasKeywords={keywords.filter(k => k.active).length > 0}
      />
      
      <main className="flex-1 overflow-y-auto md:ml-64 relative">
        {isRefreshing && (
          <div className="fixed top-0 right-0 left-0 md:left-64 h-1 bg-indigo-100 overflow-hidden z-[100]">
            <div className="h-full bg-indigo-600 animate-[loading_1.5s_infinite]" style={{ width: '40%' }}></div>
          </div>
        )}

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
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
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto mt-10">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold mb-2">Platform Settings</h2>
                <p className="text-slate-500">Configure your local automation engine.</p>
              </div>
              
              <div className="space-y-6">
                <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex justify-between items-center transition-all">
                  <div>
                    <h4 className="font-bold">Auto-Discovery Scan</h4>
                    <p className="text-sm text-slate-500">Scan socials automatically every 60 minutes</p>
                  </div>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, autoScan: !s.autoScan }))}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${settings.autoScan ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition ${settings.autoScan ? 'translate-x-5' : 'translate-x-0'} translate-y-[2px]`} />
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

export default App;
