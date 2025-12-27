
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types.ts";

export const analyzeLeadWithAI = async (leadContent: string, keywords: string[]): Promise<Lead['aiAnalysis']> => {
  // Always create new instance inside the function to ensure process.env.API_KEY is available
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  const searchQueries = keywordConfigs.map(k => `${k.term} ${k.location ? `in ${k.location}` : ''}`).join(', ');

  const prompt = `Act as a real-time social media monitoring system. 
  Simulate the discovery of 6 highly realistic, unique social media posts (Reddit, Twitter, or LinkedIn) where users express a clear intent, problem, or need related to these specific keyword and location combinations: ${searchQueries}. 
  
  CRITICAL: If a location is specified for a keyword, the post content MUST reflect that local context (e.g., "Looking for a plumber in Austin").
  
  Return the output as a JSON array of objects. 
  Each object must have:
  - platform: "Reddit", "Twitter", or "LinkedIn"
  - author: A realistic username
  - content: A detailed post content expressing need or asking for help
  - intentScore: A number from 0 to 100
  - url: A mock URL string
  - location: The city/state if applicable, otherwise "Global"
  
  Only return the JSON array.`;

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

    const text = response.text.trim();
    // Extra safety: strip potential markdown code blocks
    const jsonStr = text.startsWith('```') ? text.replace(/```json|```/g, '') : text;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Discovery API Error:", error);
    throw error;
  }
};
