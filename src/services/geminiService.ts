

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Scene } from "../types";
import { GeminiResponseSchema } from "../schemas";

// FIX: Removed `declare const process` block to adhere to guidelines.
// Assuming 'process' is available in the execution environment as per guidelines.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export async function generateScenesFromScript(script: string): Promise<Omit<Scene, 'id' | 'video' | 'audioUrl'>[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a professional video editor. Analyze the following script and break it down into logical scenes for a short vertical video. For each scene, provide a brief, visually descriptive summary that can be used to search for stock videos, and the exact script portion for that scene's voiceover.

      Script:
      ---
      ${script}
      ---
      
      Respond in the required JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  scene_number: {
                    type: Type.INTEGER,
                    description: "The sequential number of the scene.",
                  },
                  description: {
                    type: Type.STRING,
                    description: "A short, visual description of the scene for searching stock videos (e.g., 'A person typing on a laptop in a cafe').",
                  },
                  script: {
                    type: Type.STRING,
                    description: "The exact text from the script that will be used for the voiceover and subtitles in this scene.",
                  },
                },
                required: ["scene_number", "description", "script"],
              },
            },
          },
          required: ["scenes"],
        },
      },
    });

    const jsonResponse = JSON.parse(response.text);

    // Validate the response using Zod schema
    const validatedResponse = GeminiResponseSchema.parse(jsonResponse);

    // Add default duration to satisfy the Scene type
    return validatedResponse.scenes.map(scene => ({
      ...scene,
      duration: 0 // Default duration, can be updated later
    }));
  } catch (error) {
    console.error("Error generating scenes from script:", error);
    throw new Error("Failed to generate scenes. Please check your script and try again.");
  }
}

export async function generateTTS(text: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say with a clear and engaging tone: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data received from TTS API.");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error generating TTS:", error);
    throw new Error("Failed to generate voiceover.");
  }
}