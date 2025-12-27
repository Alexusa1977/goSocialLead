
import React, { useState, useEffect } from 'react';
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

  const refreshLeads = async () => {
    const activeTerms = keywords.filter(k => k.active).map(k => k.term);
    if (activeTerms.length === 0) {
      alert("Please add and enable some keywords first!");
      return;
    }

    setIsRefreshing(true);
    try {
      const results = await discoverNewLeads(activeTerms);
      const newLeads: Lead[] = results.map((r, i) => ({
        ...r as any,
        id: Math.random().toString(36).substr(2, 9),
        keywordId: 'random',
        timestamp: Date.now() - (i * 300000),
        status: 'new'
      }));
      setLeads(prev => [...newLeads, ...prev]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar currentView={view} onNavigate={setView} />
      
      <main className="flex-1 overflow-y-auto md:ml-64 relative">
        {/* Top Progress for refreshing */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-200 overflow-hidden z-50">
            <div className="h-full bg-indigo-600 animate-[loading_1s_infinite]" style={{ width: '30%', transform: 'translateX(-100%)' }}></div>
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
            />
          )}
          {view === 'settings' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-4">Settings</h2>
              <p className="text-slate-500 mb-8">Configure your AI agent and platform connections.</p>
              <div className="space-y-4 text-left">
                <div className="p-4 border border-slate-200 rounded-xl flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">Auto-Scan</h4>
                    <p className="text-sm text-slate-400">Scan socials every 1 hour automatically</p>
                  </div>
                  <div className="w-12 h-6 bg-indigo-600 rounded-full flex items-center justify-end px-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl flex justify-between items-center opacity-50">
                  <div>
                    <h4 className="font-bold">Email Notifications</h4>
                    <p className="text-sm text-slate-400">Get digests of high-intent leads</p>
                  </div>
                  <div className="w-12 h-6 bg-slate-300 rounded-full flex items-center px-1">
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%) }
          100% { transform: translateX(350%) }
        }
      `}</style>
    </div>
  );
};

export default App;
