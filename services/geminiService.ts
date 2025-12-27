
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types.ts";

export const analyzeLeadWithAI = async (leadContent: string, keywords: string[]): Promise<Lead['aiAnalysis']> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const prompt = `Analyze this social media post for business lead potential. 
  The relevant keywords are: ${keywords.join(', ')}.
  
  Post Content: "${leadContent}"
  
  Provide a summary of what they need, a suggested professional reply, and an urgency level.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggestedReply: { type: Type.STRING },
            urgency: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
          },
          required: ["summary", "suggestedReply", "urgency"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      summary: "Could not analyze post.",
      suggestedReply: "Hello, I saw your post and would love to help. Let's connect!",
      urgency: 'medium'
    };
  }
};

export const discoverNewLeads = async (keywordConfigs: { term: string; location?: string }[]): Promise<Partial<Lead>[]> => {
  if (!keywordConfigs || keywordConfigs.length === 0) return [];
  
  // Instance created inside call to ensure process.env.API_KEY is accessible.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  const searchQueries = keywordConfigs.map(k => `${k.term} ${k.location ? `in ${k.location}` : ''}`).join(', ');

  const prompt = `Act as an advanced social media monitoring tool. 
  Generate 8 highly realistic, unique social media posts (Reddit, Twitter, or LinkedIn) where users express a specific business need or "hiring/looking for" intent related to: ${searchQueries}. 
  
  Rules:
  1. If a location is provided (e.g. Austin), the post must mention needing the service in that specific area.
  2. Vary the tone (formal, casual, frustrated, urgent).
  3. Include realistic author handles.
  
  Return the output as a JSON array. 
  Objects must contain: platform, author, content, intentScore (0-100), url (mock), and location.
  
  Example format: [{"platform": "Reddit", "author": "dev_guru", "content": "Looking for local web designers...", "intentScore": 95, "url": "https://reddit.com/r/...", "location": "Austin, TX"}]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              platform: { type: Type.STRING, enum: ["Reddit", "Twitter", "Facebook", "LinkedIn", "Quora"] },
              author: { type: Type.STRING },
              content: { type: Type.STRING },
              intentScore: { type: Type.NUMBER },
              url: { type: Type.STRING },
              location: { type: Type.STRING }
            },
            required: ["platform", "author", "content", "intentScore", "url"]
          }
        }
      }
    });

    const rawText = response.text.trim();
    // Handling potential markdown formatting from model
    const cleanJson = rawText.startsWith('```') ? rawText.replace(/```json|```/g, '').trim() : rawText;
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Discovery API Error:", error);
    throw error;
  }
};
