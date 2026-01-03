
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Budget } from "../types";

/**
 * วิเคราะห์ข้อมูลทางการเงินด้วย Gemini AI
 */
export const getFinancialInsights = async (transactions: Transaction[], budgets: Budget[]): Promise<any> => {
  // เข้าถึง API Key อย่างปลอดภัยผ่าน globalThis เพื่อป้องกัน ReferenceError: process is not defined
  const apiKey = (globalThis as any).process?.env?.API_KEY;

  if (!apiKey) {
    return { 
      insights: [{ 
        title: 'AI Standby', 
        recommendation: 'ระบบ AI พร้อมทำงานเมื่อมีการเชื่อมต่อ API Key คุณสามารถใช้งานส่วนอื่นๆ ได้ตามปกติ', 
        priority: 'low' 
      }] 
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Analyze this student financial data:
    Transactions: ${JSON.stringify(transactions)}
    Budgets: ${JSON.stringify(budgets)}
    Please provide 3 helpful insights in Thai for a student. Response must be JSON.
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
                  priority: { type: Type.STRING }
                },
                required: ['title', 'recommendation', 'priority']
              }
            }
          },
          required: ['insights']
        }
      }
    });

    const text = response.text;
    return JSON.parse(text || '{"insights": []}');
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { insights: [] };
  }
};
