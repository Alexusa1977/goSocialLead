
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types.ts";

export const analyzeLeadWithAI = async (leadContent: string, keywords: string[]): Promise<Lead['aiAnalysis']> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing. Please check your configuration.");
  
  const ai = new GoogleGenAI({ apiKey });
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
    console.error("AI Analysis Failed:", error);
    return {
      summary: "Could not analyze post.",
      suggestedReply: "Hello, I saw your post and would love to help. Let's connect!",
      urgency: 'medium'
    };
  }
};

export const discoverNewLeads = async (keywordConfigs: { term: string; location?: string }[]): Promise<Partial<Lead>[]> => {
  if (!keywordConfigs || keywordConfigs.length === 0) return [];
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Environment API Key is not available.");

  const ai = new GoogleGenAI({ apiKey });

  const searchQueries = keywordConfigs.map(k => `${k.term}${k.location ? ` in ${k.location}` : ''}`).join(', ');

  const prompt = `Act as an advanced social media listening engine. 
  Generate 8 realistic, distinct social media posts (Reddit, Twitter, or LinkedIn) where users express a genuine business need related to: ${searchQueries}. 
  
  Return the results as a JSON object with a "leads" array.
  Each lead object must contain: platform, author, content, intentScore (0-100), url (mock), and location.
  
  Ensure posts are professional and do not contain sensitive or prohibited content to avoid triggering safety filters.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leads: {
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
          },
          required: ["leads"]
        }
      }
    });

    const rawText = response.text.trim();
    const cleanJson = rawText.startsWith('```') ? rawText.replace(/```json|```/g, '').trim() : rawText;
    const parsed = JSON.parse(cleanJson);
    return parsed.leads || [];
  } catch (error) {
    console.error("Discovery Engine Failed:", error);
    throw error;
  }
};
