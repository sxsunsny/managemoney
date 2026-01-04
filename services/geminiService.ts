
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Budget, AppLanguage } from "../types";

/**
 * วิเคราะห์ข้อมูลทางการเงินด้วย Gemini AI โดยใช้ Local Storage Data
 */
export const getFinancialInsights = async (
  transactions: Transaction[], 
  budgets: Budget[], 
  lang: AppLanguage = 'th'
): Promise<any> => {
  let apiKey = '';
  try {
    apiKey = process.env.API_KEY || '';
  } catch (e) {
    console.warn("API_KEY access warning");
  }

  if (!apiKey) {
    const errorMsg = lang === 'th' 
      ? 'ระบบ AI ต้องการ API Key ในการวิเคราะห์ข้อมูล คุณยังสามารถจดบันทึกได้ตามปกติ' 
      : 'AI needs an API Key to analyze data. You can still record transactions normally.';
    const title = lang === 'th' ? 'AI ยังไม่พร้อมใช้งาน' : 'AI Not Ready';
    
    return { 
      insights: [{ 
        title: title, 
        recommendation: errorMsg, 
        priority: 'low' 
      }] 
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are a professional student financial advisor.
    Analyze this student's monthly spending and budget data:
    Transactions: ${JSON.stringify(transactions)}
    Budgets: ${JSON.stringify(budgets)}
    
    Please provide 3 useful financial insights/tips for a student.
    Response must be in ${lang === 'th' ? 'Thai' : 'English'}.
    Response must be ONLY a JSON object.
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

    const jsonStr = response.text || '{"insights": []}';
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { insights: [] };
  }
};
