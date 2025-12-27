
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types.ts";

// Initialize with a fallback empty string if API_KEY is missing to prevent crash, 
// though the platform should always provide it.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const analyzeLeadWithAI = async (leadContent: string, keywords: string[]): Promise<Lead['aiAnalysis']> => {
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

export const discoverNewLeads = async (keywords: string[]): Promise<Partial<Lead>[]> => {
  if (keywords.length === 0) return [];

  const prompt = `Generate 3 realistic social media posts (from platforms like Reddit, Twitter, Facebook) that would be considered organic leads for the following business keywords: ${keywords.join(', ')}.
  Return the data in a structured JSON format.`;

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
              platform: { type: Type.STRING },
              author: { type: Type.STRING },
              content: { type: Type.STRING },
              intentScore: { type: Type.NUMBER },
              url: { type: Type.STRING }
            },
            required: ["platform", "author", "content", "intentScore", "url"]
          }
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Discovery Error:", error);
    return [];
  }
};
