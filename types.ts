
export type Platform = 'Reddit' | 'Twitter' | 'Facebook' | 'LinkedIn' | 'Quora';

export interface Keyword {
  id: string;
  term: string;
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
