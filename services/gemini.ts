
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ChatMessage, GroundingSource, EventItem } from "../types";

const API_KEY = process.env.API_KEY || "";

export const getGeminiChatResponse = async (
  prompt: string,
  history: ChatMessage[] = []
) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are 'Lili', a local Parisian expert assistant for international students. You help with lifestyle, nightlife, bureaucracy, and socializing. Proactively check if the user is new to Paris; if so, prioritize advice on central, accessible, and well-documented locations. Keep your tone chic and helpful. 🇫🇷 ✨",
    },
  });

  const response = await chat.sendMessage({ message: prompt });
  return {
    text: response.text || "Pardon, I didn't quite catch that.",
  };
};

export const discoverEvents = async (query: string): Promise<{ events: EventItem[], sources: GroundingSource[] }> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const today = new Date().toISOString().split('T')[0];
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Today is ${today}. Find upcoming events in Paris for international students: ${query}. 
    
    CURATION RULES:
    - Include ALL types of events, including those that require advanced local knowledge, complex late-night travel (suburbs/banlieue), or those with minimal public information.
    - IMPORTANT: For events that are centrally located (Arrondissements 1-11), well-documented, and easy to access, set 'isAccessible' to true.
    - For events in the suburbs, niche underground parties, or places with complex access, set 'isAccessible' to false.
    - If information is sparse, describe what is known and suggest how to find more (e.g., 'Check Instagram tags').`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          events: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                date: { type: Type.STRING },
                isoDate: { type: Type.STRING },
                startTime: { type: Type.STRING, description: "Start time in HH:mm format if available, otherwise null" },
                endTime: { type: Type.STRING, description: "End time in HH:mm format if available, otherwise null" },
                location: { type: Type.STRING },
                description: { type: Type.STRING },
                vibe: { type: Type.STRING },
                isAccessible: { type: Type.BOOLEAN, description: "True ONLY if central, well-documented, and beginner-friendly." },
                accessibilityReason: { type: Type.STRING, description: "Briefly why it is a 'Safe Bet' or why it might be challenging for a newcomer." }
              },
              required: ["id", "title", "category", "date", "isoDate", "location", "description", "vibe", "isAccessible"]
            }
          }
        }
      }
    },
  });

  try {
    const data = JSON.parse(response.text || '{"events": []}');
    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(chunk => chunk.web)
      ?.map(chunk => ({
        title: chunk.web?.title || "View Source",
        uri: chunk.web?.uri || "#"
      })) || [];

    return { events: data.events || [], sources };
  } catch (e) {
    console.error("Failed to parse Gemini response as JSON", e);
    return { events: [], sources: [] };
  }
};

export const explorePlaces = async (query: string, location?: { lat: number; lng: number }) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Recommend student spots in Paris for: ${query}. Include both famous central spots and hidden local gems. Mark if they are easy to reach or require local expertise.`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: location ? { latitude: location.lat, longitude: location.lng } : undefined
        }
      }
    },
  });

  const text = response.text || "";
  const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.maps)
    ?.map(chunk => ({
      title: chunk.maps?.title || "View on Maps",
      uri: chunk.maps?.uri || "#"
    })) || [];

  return { text, sources };
};
