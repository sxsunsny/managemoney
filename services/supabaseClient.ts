
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

// ฟังก์ชันดึงค่าจาก env อย่างปลอดภัยบน Browser
const getSafeEnv = (key: string): string => {
  try {
    // เช็คว่ามี process และ process.env หรือไม่
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {
    // ป้องกันแอปพังถ้าเข้าถึง process ไม่ได้
  }
  return '';
};

const supabaseUrl = getSafeEnv('SUPABASE_URL');
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = () => {
  return supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 10;
};

// สร้าง Client เฉพาะเมื่อมีการตั้งค่าที่ถูกต้องเท่านั้น
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
