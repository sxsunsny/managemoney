
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Budget } from "../types";

/**
 * วิเคราะห์ข้อมูลทางการเงินด้วย Gemini AI โดยใช้ Local Storage Data
 */
export const getFinancialInsights = async (transactions: Transaction[], budgets: Budget[]): Promise<any> => {
  // ดึง API Key อย่างปลอดภัยเพื่อไม่ให้แอปพังบน Browser ที่ไม่มี process object
  let apiKey = '';
  try {
    apiKey = process.env.API_KEY || '';
  } catch (e) {
    console.warn("API_KEY access warning");
  }

  if (!apiKey) {
    return { 
      insights: [{ 
        title: 'AI ยังไม่พร้อมใช้งาน', 
        recommendation: 'ระบบ AI ต้องการ API Key ในการวิเคราะห์ข้อมูล คุณยังสามารถจดบันทึกได้ตามปกติ', 
        priority: 'low' 
      }] 
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    คุณเป็นที่ปรึกษาทางการเงินสำหรับนักเรียนนักศึกษา
    วิเคราะห์ข้อมูลการใช้จ่ายและงบประมาณรายเดือนของนักศึกษาคนนี้:
    รายการธุรกรรม: ${JSON.stringify(transactions)}
    งบประมาณที่ตั้งไว้: ${JSON.stringify(budgets)}
    
    โปรดให้ข้อมูลเชิงลึก 3 ข้อที่เป็นประโยชน์ต่อวัยเรียน (ภาษาไทย) โดยตอบเป็น JSON เท่านั้น
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

    const jsonStr = response.text || '{"insights": []}';
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { insights: [] };
  }
};
