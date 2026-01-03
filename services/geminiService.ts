
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Budget } from "../types";

export const getFinancialInsights = async (transactions: Transaction[], budgets: Budget[]): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    คุณเป็นที่ปรึกษาทางการเงินสำหรับนักเรียนนักศึกษา
    วิเคราะห์ข้อมูลการใช้จ่ายและงบประมาณรายเดือนของนักศึกษาคนนี้:
    รายการธุรกรรม: ${JSON.stringify(transactions)}
    งบประมาณที่ตั้งไว้: ${JSON.stringify(budgets)}
    
    โปรดให้ข้อมูลเชิงลึก 3 ข้อที่เป็นประโยชน์ต่อวัยเรียน โดยเน้น:
    1. การบริหารค่าขนมให้พอใช้ถึงสิ้นเดือน
    2. เทคนิคการประหยัดค่าอุปกรณ์การเรียนหรือค่ากิน
    3. แนวทางการออมเงินก้อนแรกหรือการลงทุนเล็กๆ น้อยๆ สำหรับนักศึกษา
    
    คำตอบต้องเป็นภาษาไทยที่เข้าใจง่าย เป็นกันเอง และให้กำลังใจ
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
