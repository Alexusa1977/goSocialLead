
import React, { useState } from 'react';
import { Keyword } from '../types';

interface KeywordManagerProps {
  keywords: Keyword[];
  onAdd: (term: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

const KeywordManager: React.FC<KeywordManagerProps> = ({ keywords, onAdd, onRemove, onToggle }) => {
  const [newTerm, setNewTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTerm.trim()) {
      onAdd(newTerm.trim());
      setNewTerm('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Keyword Strategy</h2>
        <p className="text-slate-500">Define the topics, pain points, or questions you want to monitor across platforms.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="e.g., 'need help with marketing' or 'best CRM for small business'"
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        <button 
          type="submit"
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Add Keyword
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Current Keywords</h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{keywords.length} TOTAL</span>
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
                  <div className={`w-2 h-2 rounded-full ${kw.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <div>
                    <p className={`font-medium ${kw.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{kw.term}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Added {new Date(kw.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onToggle(kw.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      kw.active ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {kw.active ? 'Disable' : 'Enable'}
                  </button>
                  <button 
                    onClick={() => onRemove(kw.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[
          { title: 'Best Practice', text: 'Use conversational phrases like "Does anyone know" or "Recommendation for"' },
          { title: 'Local Intent', text: 'Add city names if you are a local business: "Plumber in Chicago"' },
          { title: 'Competitors', text: 'Monitor mentions of your competitors to find dissatisfied customers.' },
        ].map((tip, i) => (
          <div key={i} className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">{tip.title}</h4>
            <p className="text-xs text-indigo-700 leading-relaxed">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeywordManager;
