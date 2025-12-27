
import React, { useState } from 'react';
import { Lead } from '../types.ts';
import { analyzeLeadWithAI } from '../services/geminiService.ts';

interface LeadListProps {
  leads: Lead[];
  onUpdateStatus: (id: string, status: Lead['status']) => void;
  onRefresh: () => void;
  keywords: string[];
}

const LeadList: React.FC<LeadListProps> = ({ leads, onUpdateStatus, onRefresh, keywords }) => {
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isBtnRefreshing, setIsBtnRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsBtnRefreshing(true);
    await onRefresh();
    setIsBtnRefreshing(false);
  };

  const handleAnalyze = async (lead: Lead) => {
    setAnalyzingId(lead.id);
    const analysis = await analyzeLeadWithAI(lead.content, keywords);
    lead.aiAnalysis = analysis;
    setSelectedLead({ ...lead });
    setAnalyzingId(null);
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case 'Reddit': return '🤖';
      case 'Twitter': return '🐦';
      case 'Facebook': return '👤';
      case 'LinkedIn': return '💼';
      default: return '🔗';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lead Feed</h2>
          <p className="text-slate-500">Recent social mentions matching your keywords.</p>
        </div>
        <button 
          onClick={handleManualRefresh}
          disabled={isBtnRefreshing}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {isBtnRefreshing ? (
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {isBtnRefreshing ? 'Scanning...' : 'Scan Socials'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {leads.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-400">No leads found yet. Try adding more keywords or refreshing.</p>
            </div>
          ) : (
            leads.map(lead => (
              <div 
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`group bg-white p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedLead?.id === lead.id ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-slate-100 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{getPlatformIcon(lead.platform)}</span>
                    <div>
                      <h4 className="font-bold text-slate-900">{lead.author}</h4>
                      <p className="text-xs text-slate-400">{new Date(lead.timestamp).toLocaleString()} • {lead.platform}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      lead.intentScore > 80 ? 'bg-emerald-100 text-emerald-700' : 
                      lead.intentScore > 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      Score: {lead.intentScore}%
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold capitalize ${
                      lead.status === 'new' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
                <p className="text-slate-700 text-sm line-clamp-3 leading-relaxed mb-4">
                  {lead.content}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                   <div className="flex space-x-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateStatus(lead.id, 'contacted'); }}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Mark Contacted
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateStatus(lead.id, 'rejected'); }}
                      className="text-xs font-semibold text-slate-400 hover:underline"
                    >
                      Dismiss
                    </button>
                   </div>
                   <button 
                    onClick={(e) => { e.stopPropagation(); handleAnalyze(lead); }}
                    disabled={analyzingId === lead.id}
                    className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center"
                   >
                    {analyzingId === lead.id ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </span>
                    ) : 'AI Analysis'}
                   </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-6 h-fit min-h-[400px]">
          {selectedLead ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Details</h3>
                <p className="text-sm text-slate-500">Analysis & Strategy</p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-800 leading-relaxed italic">"{selectedLead.content}"</p>
                <a href={selectedLead.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-indigo-600 font-medium">View Original Post ↗</a>
              </div>

              {selectedLead.aiAnalysis ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2">Intent Summary</h4>
                    <p className="text-sm text-slate-700">{selectedLead.aiAnalysis.summary}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2">AI Suggestion</h4>
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <p className="text-sm text-indigo-900 font-medium mb-3">{selectedLead.aiAnalysis.suggestedReply}</p>
                      <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
                        Copy to Clipboard
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs font-medium text-slate-500">Priority Level</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedLead.aiAnalysis.urgency === 'high' ? 'bg-red-100 text-red-700' :
                      selectedLead.aiAnalysis.urgency === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedLead.aiAnalysis.urgency}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <span className="block text-4xl mb-2">✨</span>
                  <p className="text-sm">Click "AI Analysis" to reveal insights and a personalized response strategy.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-20">
              <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-sm font-medium">Select a lead from the feed<br/>to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadList;
