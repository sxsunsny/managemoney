
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Budget } from "../types";

export const getFinancialInsights = async (transactions: Transaction[], budgets: Budget[]): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Analyze this user's monthly spending and budget data.
    Transactions: ${JSON.stringify(transactions)}
    Budgets: ${JSON.stringify(budgets)}
    
    Provide 3 actionable financial insights. 
    Focus on:
    1. Overspending patterns relative to budgets.
    2. Potential areas for saving.
    3. Wealth building advice.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
                },
                required: ['title', 'recommendation', 'priority']
              }
            }
          },
          required: ['insights']
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { insights: [] };
  }
};
