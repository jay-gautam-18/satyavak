import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import type { ExpertLocationResult, LegalNewsArticle, LegalAidResponse } from '../types';

// Read API key from Vite env (recommended for frontend) or fallback to process.env (server-side).
// Vite exposes variables prefixed with VITE_ via import.meta.env
const API_KEY: string | undefined = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_GEMINI_API_KEY : undefined) || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);

function getAI(): InstanceType<typeof GoogleGenAI> {
  if (!API_KEY) {
    // Defer throwing until a function actually needs the client to avoid crashing the whole app at import time.
    throw new Error(
      'Gemini API key is not configured. Set VITE_GEMINI_API_KEY in your .env (for Vite) or process.env.API_KEY for server usage. See README.md for details.'
    );
  }
  return new GoogleGenAI({ apiKey: API_KEY });
}

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    if (targetLanguage.toLowerCase() === 'english' || !text) return text;
    try {
        const model = 'gemini-2.5-flash';
    const ai = getAI();
    const response = await ai.models.generateContent({
      model,
      contents: `Translate the following text to ${targetLanguage}. Do not add any extra commentary, just provide the raw translation.: "${text}"`,
      config: { temperature: 0 },
    });
        return response.text.trim();
    } catch (error) {
        console.error(`Translation failed for text: "${text}" to ${targetLanguage}`, error);
        return text; // Fallback to original text on error
    }
};


export const getChatbotResponse = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], newMessage: string) => {
  const model = 'gemini-2.5-flash';
  try {
    const ai = getAI();
    const chat = ai.chats.create({
      model,
      history,
      config: {
        systemInstruction: "You are Satyavāk, an AI legal assistant for India. Your goal is to democratize access to justice. Explain complex legal concepts in simple, easy-to-understand language. When asked, translate legal terms into regional Indian languages. Summarize lengthy laws and judgments. After providing information, suggest concrete next steps a user might take, such as 'File an FIR' or 'Consult a lawyer.' Maintain a helpful, unbiased, and reassuring tone. You must not provide legal advice, but you can provide legal information.",
      }
    });
    const response = await chat.sendMessage({ message: newMessage });
    return response;
  } catch (err) {
    throw err;
  }
};

export const findLegalAid = async (query: string, location: { latitude: number; longitude: number } | null): Promise<LegalAidResponse> => {
  const model = 'gemini-2.5-flash';

  const config: {
    tools: { googleMaps: Record<string, never> }[];
    toolConfig?: { retrievalConfig: { latLng: { latitude: number; longitude: number } } };
  } = {
    tools: [{ googleMaps: {} }],
  };

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      },
    };
  }
  
  const prompt = `Based on my current location and the query "${query}", provide a helpful, single-paragraph summary of the types of legal aid centers, NGOs, and courts that might be available nearby. Mention the kinds of services they generally offer. Your response should be friendly and informative. Do not list specific places, as a separate list will be generated from your search results.`;

  const ai = getAI();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: config
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  const locations: ExpertLocationResult[] = groundingChunks
      .filter(chunk => chunk.maps)
      .map(chunk => ({
          title: chunk.maps!.title,
          mapUri: chunk.maps!.uri,
          description: "For detailed information including user reviews, contact details, and precise location, please view this place on Google Maps.",
          // Mock data for demonstration of filtering/sorting.
          distance: `${(Math.random() * 10 + 0.5).toFixed(1)} km away`,
          rating: parseFloat((Math.random() * (5.0 - 3.5) + 3.5).toFixed(1)),
      }));
  
  if (locations.length === 0 && !response.text.trim()) {
      throw new Error("Could not find any relevant locations. Please try a different search query.");
  }

  return {
    summary: response.text,
    locations,
  };
};

export const getLegalNews = async (query: string): Promise<LegalNewsArticle[]> => {
  const model = 'gemini-2.5-flash';
  const prompt = `Based on the query: "${query}", find up to 15 recent and trending legal news, landmark case studies, and important affairs in India using Google Search. Return the results as a JSON array of objects. Each object must have the keys: "headline", "summary", "publisher", "date", "detailedBrief", and "keyPoints". The 'date' should be a valid date string. The 'keyPoints' should be an array of strings highlighting the most important takeaways. If no results are found, return an empty JSON array []. Output ONLY the JSON array, with no additional text, introductory phrases, or markdown formatting.`;

  const ai = getAI();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{googleSearch: {}}],
    }
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
          title: chunk.web!.title,
          uri: chunk.web!.uri,
      }));

  try {
    const jsonString = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
    let articles: LegalNewsArticle[] = JSON.parse(jsonString);
    if (Array.isArray(articles)) {
      if (sources.length > 0) {
        articles = articles.map(article => ({ ...article, sources }));
      }
      return articles;
    }
    return [];
  } catch (e) {
    console.error("Failed to parse JSON response from AI for news:", e);
    console.error("Raw response text for news:", response.text);
    throw new Error("Could not retrieve or parse news data.");
  }
};

export const getRelatedNews = async (headline: string): Promise<LegalNewsArticle[]> => {
    const model = 'gemini-2.5-flash';
    const prompt = `Based on the legal news headline: "${headline}", find up to 3 similar or related legal news articles or landmark case studies from India using Google Search. Do not include the original article in the results. Return the results as a JSON array of objects. Each object must have the keys: "headline", "summary", "publisher", "date", "detailedBrief", and "keyPoints". The 'date' should be a valid date string. The 'keyPoints' should be an array of strings. If no related results are found, return an empty JSON array []. Output ONLY the JSON array, with no additional text, introductory phrases, or markdown formatting.`;

  const ai = getAI();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{googleSearch: {}}],
    }
  });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
            title: chunk.web!.title,
            uri: chunk.web!.uri,
        }));

    try {
        const jsonString = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
        let articles: LegalNewsArticle[] = JSON.parse(jsonString);
        if (Array.isArray(articles)) {
             if (sources.length > 0) {
                articles = articles.map(article => ({ ...article, sources }));
            }
            return articles;
        }
        return [];
    } catch (e) {
        console.error("Failed to parse JSON response from AI for related news:", e);
        console.error("Raw response text for related news:", response.text);
        // Return empty array on failure instead of throwing, as it's a non-critical feature.
        return [];
    }
};

export const getInteractiveCourtroomResponse = async (
  history: { speaker: 'defense' | 'prosecution' | 'judge'; dialogue: string }[],
  userRole: 'defense' | 'prosecution',
  scenarioTitle: string
): Promise<{ speaker: 'defense' | 'prosecution' | 'judge'; dialogue: string; verdict?: boolean; reasoning?: string }> => {
  const model = 'gemini-2.5-pro'; // Use a more advanced model for better reasoning and JSON adherence
  const opponentRole = userRole === 'defense' ? 'prosecution' : 'defense';

  const historyString = history.map(turn => `${turn.speaker.toUpperCase()}: ${turn.dialogue}`).join('\n');

  const prompt = `You are a sophisticated AI controlling a virtual courtroom simulation for a user practicing law.
The scenario is: "${scenarioTitle}".
The human user is playing the role of: ${userRole}.
You will play the roles of the ${opponentRole} and the Judge.
The conversation flow is typically Defense -> Prosecution -> Defense -> Prosecution -> etc., with the Judge interjecting when appropriate to ask questions, rule on objections, or move the proceedings along.
Based on the following chat history, generate the response for the next logical speaker. Your response should be as the character speaking.
After 2-3 exchanges between the lawyers, the Judge MUST give a final verdict and conclude the simulation. The verdict should be the final message.

CURRENT HISTORY:
---
${historyString.length > 0 ? historyString : "The hearing has just begun. The user is starting as " + userRole + "."}
---

Your response MUST be a single, valid JSON object with the following structure:
{
  "speaker": "...", // must be either "${opponentRole}" or "judge"
  "dialogue": "...", // the character's dialogue, it should be concise and direct.
  "verdict": boolean, // true if this is the final verdict from the judge, otherwise false.
  "reasoning": "..." // If "verdict" is true, provide a brief 2-3 sentence summary explaining the key reasons for the decision based on the arguments. If "verdict" is false, this field should be an empty string.
}

Do NOT add any other text, explanations, or markdown formatting around the JSON object. Just the raw JSON.`;

  const ai = getAI();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { 
      temperature: 0.7,
      responseMimeType: "application/json",
    }
  });
  
  try {
    const jsonString = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
    const aiResponse = JSON.parse(jsonString);
    
    if (!['defense', 'prosecution', 'judge'].includes(aiResponse.speaker) || !aiResponse.dialogue) {
        throw new Error("Invalid JSON structure from AI.");
    }
    if (aiResponse.speaker === userRole) {
        aiResponse.speaker = opponentRole; // Failsafe in case the model hallucinates its role
    }
    
    return aiResponse;
  } catch (e) {
    console.error("Failed to parse JSON response from AI for courtroom:", e);
    console.error("Raw response text:", response.text);
    return {
        speaker: 'judge',
        dialogue: "There seems to be a procedural error. Court is in recess for 5 minutes.",
        verdict: false,
        reasoning: "",
    };
  }
};


export const generateDocument = async (docType: string, details: Record<string, string>): Promise<GenerateContentResponse> => {
  const model = 'gemini-2.5-flash';
  const detailsString = Object.entries(details)
      .map(([key, value]) => `* ${key}: ${value}`)
      .join('\n');

  const prompt = `Generate a draft for a "${docType}" based on these details:\n${detailsString}\n\nThe document must be compliant with Indian law, written in professional legal English, and structured with appropriate sections, clauses, and proper formatting for a formal legal document. The output must be in clean, well-structured HTML format, using tags like <h1>, <h2>, <p>, <ul>, <li>, and <strong> where appropriate. Do not include any markdown, backticks, or explanatory text outside of the HTML structure. This is for informational purposes only and does not constitute legal advice.`;
  
  const ai = getAI();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
    }
  });
  return response;
};

export const getTextToSpeech = async (text: string): Promise<string | null> => {
  const model = 'gemini-2.5-flash-preview-tts';
  const ai = getAI();
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Say this in a clear, helpful, and calm voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // A calm and clear voice
        },
      },
    }
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || null;
};