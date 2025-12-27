
import React, { useState } from 'react';
import { Keyword } from '../types.ts';

interface KeywordManagerProps {
  keywords: Keyword[];
  onAdd: (term: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onScan: () => Promise<void>;
}

const KeywordManager: React.FC<KeywordManagerProps> = ({ keywords, onAdd, onRemove, onToggle, onScan }) => {
  const [newTerm, setNewTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTerm.trim()) {
      onAdd(newTerm.trim());
      setNewTerm('');
    }
  };

  const handleScanClick = async () => {
    setIsScanning(true);
    await onScan();
    setIsScanning(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Keyword Strategy</h2>
          <p className="text-slate-500">Define the topics or pain points you want to monitor.</p>
        </div>
        <button
          onClick={handleScanClick}
          disabled={isScanning || keywords.filter(k => k.active).length === 0}
          className="flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md group"
        >
          {isScanning ? (
             <span className="flex items-center">
               <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               AI Searching...
             </span>
          ) : (
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Discover Leads Now
            </span>
          )}
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex gap-2 p-1 bg-white rounded-2xl shadow-sm border border-slate-100">
        <input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="Enter a new search term..."
          className="flex-1 px-5 py-3 rounded-xl border-none focus:outline-none focus:ring-0 text-slate-700 bg-transparent"
        />
        <button 
          type="submit"
          className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
        >
          Add Keyword
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Current Keywords</h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{keywords.length} ACTIVE TERMS</span>
        </div>
        <div className="divide-y divide-slate-50">
          {keywords.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p>No keywords added yet. Start by defining your target intent terms.</p>
            </div>
          ) : (
            keywords.map(kw => (
              <div key={kw.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center space-x-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${kw.active ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-300'}`} />
                  <div>
                    <p className={`font-medium transition-all ${kw.active ? 'text-slate-900 translate-x-0' : 'text-slate-400 line-through translate-x-1'}`}>{kw.term}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Added {new Date(kw.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onToggle(kw.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      kw.active ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                    }`}
                  >
                    {kw.active ? 'Mute' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => onRemove(kw.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default KeywordManager;
