
import React, { useState, useEffect } from 'react';
import { Keyword, Folder } from '../types.ts';

interface KeywordManagerProps {
  folders: Folder[];
  keywords: Keyword[];
  onAddFolder: (name: string) => void;
  onRemoveFolder: (id: string) => void;
  onAddKeyword: (folderId: string, term: string, location?: string) => void;
  onRemoveKeyword: (id: string) => void;
  onToggleKeyword: (id: string) => void;
  onScan: () => Promise<void>;
}

const KeywordManager: React.FC<KeywordManagerProps> = ({ 
  folders, 
  keywords, 
  onAddFolder, 
  onRemoveFolder,
  onAddKeyword, 
  onRemoveKeyword, 
  onToggleKeyword
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newTerm, setNewTerm] = useState('');
  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('sociallead_active_folder_id');
    if (saved && folders.find(f => f.id === saved)) {
      setActiveFolderId(saved);
    } else if (folders.length > 0) {
      setActiveFolderId(folders[0].id);
    }
  }, [folders]);

  const handleActiveFolderChange = (id: string) => {
    setActiveFolderId(id);
    localStorage.setItem('sociallead_active_folder_id', id);
  };

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTerm.trim() && activeFolderId) {
      onAddKeyword(activeFolderId, newTerm.trim(), newLocation.trim() || undefined);
      setNewTerm('');
      setNewLocation('');
    }
  };

  const activeFolderKeywords = keywords.filter(k => k.folderId === activeFolderId);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Keyword & Location Strategy</h2>
          <p className="text-slate-500">Add keywords and locations, then click "Scan Socials" in the sidebar to find leads.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Folders</h3>
          </div>
          <div className="space-y-1">
            {folders.map(folder => (
              <div key={folder.id} className="flex group">
                <button
                  onClick={() => handleActiveFolderChange(folder.id)}
                  className={`flex-1 flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFolderId === folder.id 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <svg className={`w-4 h-4 mr-2 ${activeFolderId === folder.id ? 'text-indigo-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {folder.name}
                  <span className="ml-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">
                    {keywords.filter(k => k.folderId === folder.id).length}
                  </span>
                </button>
                <button 
                  onClick={() => onRemoveFolder(folder.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddFolder} className="pt-2">
            <input
              type="text"
              placeholder="+ New Folder"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-dashed border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-transparent text-slate-500"
            />
          </form>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {activeFolderId ? (
            <>
              <form onSubmit={handleAddKeyword} className="flex flex-col md:flex-row gap-2 p-1 bg-white rounded-2xl shadow-sm border border-slate-100">
                <input
                  type="text"
                  required
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="Service (e.g. Logo Design)"
                  className="flex-1 px-5 py-3 rounded-xl border-none focus:outline-none focus:ring-0 text-slate-700 bg-transparent"
                />
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="City, State (Optional)"
                  className="flex-1 px-5 py-3 rounded-xl border-none focus:outline-none focus:ring-0 text-slate-700 bg-transparent"
                />
                <button 
                  type="submit"
                  className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
                >
                  Add
                </button>
              </form>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <h3 className="font-bold text-slate-900 flex items-center uppercase tracking-tight text-sm">
                    {folders.find(f => f.id === activeFolderId)?.name}
                  </h3>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeFolderKeywords.length} TERMS</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {activeFolderKeywords.length === 0 ? (
                    <div className="p-16 text-center text-slate-400">
                      <p className="text-sm">No keywords here.</p>
                    </div>
                  ) : (
                    activeFolderKeywords.map(kw => (
                      <div key={kw.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center space-x-4">
                          <button 
                            onClick={() => onToggleKeyword(kw.id)}
                            className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                              kw.active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                            }`}
                          >
                            {kw.active && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                          </button>
                          <div>
                            <p className={`font-medium ${kw.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                              {kw.term}
                            </p>
                            {kw.location && (
                              <p className="text-xs text-indigo-500 font-medium">📍 {kw.location}</p>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => onRemoveKeyword(kw.id)}
                          className="p-2 text-slate-300 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
              <p>Select a folder to manage keywords.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeywordManager;
