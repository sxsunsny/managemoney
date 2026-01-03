
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Budget } from "../types";

export const getFinancialInsights = async (transactions: Transaction[], budgets: Budget[]): Promise<any> => {
  let apiKey = '';
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      apiKey = process.env.API_KEY;
    }
  } catch (e) {}

  if (!apiKey) {
    return { 
      insights: [{ 
        title: 'AI ยังไม่พร้อมใช้งาน', 
        recommendation: 'กรุณาตั้งค่า API_KEY ใน Environment Variables เพื่อใช้งานฟีเจอร์นี้', 
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
    
    โปรดให้ข้อมูลเชิงลึก 3 ข้อที่เป็นประโยชน์ต่อวัยเรียน โดยตอบเป็น JSON เท่านั้น
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

    return JSON.parse(response.text || '{"insights": []}');
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { insights: [] };
  }
};
