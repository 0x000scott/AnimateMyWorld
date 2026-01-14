
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PersonaDetails } from "../types";

// Note: API_KEY is handled by the platform or injected via environment.
// For Veo models, we check window.aistudio.hasSelectedApiKey in the UI.

export const analyzeImage = async (base64Image: string): Promise<PersonaDetails> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1],
          },
        },
        {
          text: "Analyze this image and identify the most prominent object. If multiple, pick one. Imagine this object as a living character. Provide: 1. The object name. 2. A funny personality description. 3. A detailed prompt for a 5-second video animation where the object moves, blinks, or dances in a human-like way while keeping its original form.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          objectName: { type: Type.STRING },
          personality: { type: Type.STRING },
          animationPrompt: { type: Type.STRING },
        },
        required: ["objectName", "personality", "animationPrompt"],
      },
    },
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    throw new Error("Failed to parse analysis results");
  }
};

export const generateAnimation = async (
  base64Image: string, 
  prompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Veo 3.1 Fast for quick generation
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: base64Image.split(',')[1],
      mimeType: 'image/jpeg',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 8000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed - no URI returned");

  const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};
