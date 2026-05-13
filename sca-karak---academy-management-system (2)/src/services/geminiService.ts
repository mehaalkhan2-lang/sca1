import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("Gemini API Key is not configured. Please set GEMINI_API_KEY in the Secrets panel (Settings > Secrets).");
    }
    
    try {
      aiClient = new GoogleGenAI({ apiKey });
    } catch (e: any) {
      console.error("Failed to initialize GoogleGenAI:", e);
      throw new Error(`AI Initialization Failed: ${e.message}`);
    }
  }
  return aiClient;
}

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export async function generateMCQs(topic: string, classLevel: string, subject: string, count: number = 5): Promise<GeneratedQuestion[]> {
  const client = getAiClient();
  const prompt = `Generate ${count} high-quality multiple choice questions (MCQs) for ${classLevel} class ${subject} students on the topic: "${topic}". 
  Ensure the questions are accurate and relevant to the curriculum.
  For each question, provide 4 options and specify the index of the correct answer (0-3).`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: "The text of the question",
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of 4 possible answers",
              },
              correctAnswerIndex: {
                type: Type.INTEGER,
                description: "The zero-based index of the correct option",
              }
            },
            required: ["question", "options", "correctAnswerIndex"]
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    const questions = JSON.parse(response.text.trim());
    return questions;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}
