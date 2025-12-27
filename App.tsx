
import React, { useState, useEffect, useCallback } from 'react';
import { Keyword, Lead, Stats, Platform } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import LeadList from './components/LeadList.tsx';
import KeywordManager from './components/KeywordManager.tsx';
import { discoverNewLeads } from './services/geminiService.ts';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'leads' | 'keywords' | 'settings'>('dashboard');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    autoScan: true,
    emailNotifications: false,
  });

  // Initial dummy data for better UX
  useEffect(() => {
    const initialKeywords: Keyword[] = [
      { id: '1', term: 'web design help', active: true, createdAt: Date.now() - 1000000 },
      { id: '2', term: 'best sales tool', active: true, createdAt: Date.now() - 2000000 },
    ];
    setKeywords(initialKeywords);

    const initialLeads: Lead[] = [
      {
        id: 'l1',
        keywordId: '1',
        platform: 'Reddit',
        author: 'design_enthusiast',
        content: 'I am struggling to build my personal portfolio. Anyone know a good web designer or a builder that is not overpriced?',
        timestamp: Date.now() - 3600000,
        url: 'https://reddit.com/r/design/123',
        intentScore: 88,
        status: 'new'
      },
      {
        id: 'l2',
        keywordId: '2',
        platform: 'Twitter',
        author: 'SaaSFounderX',
        content: 'Our sales team is growing and we need a way to track organic leads on social. Any recommendations for automation?',
        timestamp: Date.now() - 7200000,
        url: 'https://twitter.com/saas/status/456',
        intentScore: 94,
        status: 'new'
      }
    ];
    setLeads(initialLeads);
  }, []);

  const handleAddKeyword = (term: string) => {
    const newKw: Keyword = {
      id: Math.random().toString(36).substr(2, 9),
      term,
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

  // Wrapped in useCallback so it's stable for useEffect and child components
  const refreshLeads = useCallback(async () => {
    const activeTerms = keywords.filter(k => k.active).map(k => k.term);
    if (activeTerms.length === 0) {
      console.warn("No active keywords found for scan.");
      return;
    }

    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      console.log(`Starting discovery scan for: ${activeTerms.join(', ')}`);
      const results = await discoverNewLeads(activeTerms);
      
      if (results && results.length > 0) {
        const newLeads: Lead[] = results.map((r, i) => ({
          ...r as any,
          id: `lead-${Date.now()}-${i}`,
          keywordId: 'manual-scan',
          timestamp: Date.now() - (i * 1000 * 60 * 5), // spaced 5 mins apart
          status: 'new'
        }));
        
        setLeads(prev => {
          // Prevent duplicates by checking content
          const existingContent = new Set(prev.map(l => l.content));
          const filteredNew = newLeads.filter(l => !existingContent.has(l.content));
          return [...filteredNew, ...prev];
        });
        console.log(`Found ${newLeads.length} potential leads.`);
      } else {
        console.log("No new leads discovered in this cycle.");
      }
    } catch (err) {
      console.error("Discovery failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [keywords, isRefreshing]);

  // Hourly Auto-Scan implementation
  useEffect(() => {
    if (!settings.autoScan) return;

    // Run discovery every 1 hour (3,600,000 milliseconds)
    const HOURLY_INTERVAL = 3600000;
    
    const intervalId = setInterval(() => {
      console.log("Auto-scan: Triggering hourly lead discovery...");
      refreshLeads();
    }, HOURLY_INTERVAL);

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

  const toggleAutoScan = () => setSettings(s => ({ ...s, autoScan: !s.autoScan }));
  const toggleEmailNotifs = () => setSettings(s => ({ ...s, emailNotifications: !s.emailNotifications }));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar currentView={view} onNavigate={setView} />
      
      <main className="flex-1 overflow-y-auto md:ml-64 relative">
        {/* Top Progress bar */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100 overflow-hidden z-50">
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
              keywords={keywords} 
              onAdd={handleAddKeyword} 
              onRemove={handleRemoveKeyword} 
              onToggle={handleToggleKeyword} 
              onScan={refreshLeads}
            />
          )}
          {view === 'settings' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold mb-2">Platform Settings</h2>
                <p className="text-slate-500">Configure your automation engine and preferences.</p>
              </div>
              
              <div className="space-y-6">
                <div className="group p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex justify-between items-center transition-all hover:border-indigo-100 hover:bg-white">
                  <div>
                    <h4 className="font-bold text-slate-900">Auto-Discovery Scan</h4>
                    <p className="text-sm text-slate-500">Scan socials automatically every 60 minutes</p>
                  </div>
                  <button 
                    onClick={toggleAutoScan}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.autoScan ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.autoScan ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="group p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex justify-between items-center transition-all hover:border-indigo-100 hover:bg-white">
                  <div>
                    <h4 className="font-bold text-slate-900">Email Notifications</h4>
                    <p className="text-sm text-slate-500">Receive high-intent lead alerts via email</p>
                  </div>
                  <button 
                    onClick={toggleEmailNotifs}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.emailNotifications ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.emailNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">API Configuration</h3>
                   <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                     <div className="flex items-center space-x-3">
                       <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold">G</div>
                       <div>
                         <p className="text-sm font-bold text-slate-900">Gemini AI Model</p>
                         <p className="text-xs text-indigo-600">Flash 2.5 Active</p>
                       </div>
                     </div>
                     <span className="text-xs font-bold text-slate-400">Connected</span>
                   </div>
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
