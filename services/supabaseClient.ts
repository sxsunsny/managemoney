
import { createClient } from '@supabase/supabase-js';

// ฟังก์ชันดึงค่าจาก env อย่างปลอดภัย
const getEnv = (key: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {
    console.warn(`Could not access process.env.${key}`);
  }
  return '';
};

const supabaseUrl = getEnv('https://rfncndopjghhtyfibhvz.supabase.co');
const supabaseAnonKey = getEnv('sb_publishable_WwniucbvGbSe078qANFMOw_tL_31vIm');

// ตรวจสอบความถูกต้องของ URL (ต้องเริ่มด้วย https://)
export const isSupabaseConfigured = () => {
  return (
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseAnonKey.length > 20
  );
};

// สร้าง Client เฉพาะเมื่อ Config ถูกต้องและไม่เป็นค่า Default ปลอม
// แก้ไข Error บรรทัด 18 โดยใช้ Try-Catch ครอบการสร้าง Client
let supabaseInstance = null;
if (isSupabaseConfigured()) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

export const supabase = supabaseInstance;
