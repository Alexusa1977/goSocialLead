
export type Platform = 'Reddit' | 'Twitter' | 'Facebook' | 'LinkedIn' | 'Quora';

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Keyword {
  id: string;
  folderId: string;
  term: string;
  location?: string; // New field for City/State targeting
  active: boolean;
  createdAt: number;
}

export interface Lead {
  id: string;
  keywordId: string;
  platform: Platform;
  author: string;
  content: string;
  timestamp: number;
  url: string;
  intentScore: number; // 0-100
  location?: string; // Detected or targeted location
  status: 'new' | 'contacted' | 'rejected' | 'archived';
  aiAnalysis?: {
    summary: string;
    suggestedReply: string;
    urgency: 'low' | 'medium' | 'high';
  };
}

export interface Stats {
  totalLeads: number;
  activeKeywords: number;
  highIntentCount: number;
  platforms: Record<Platform, number>;
}
