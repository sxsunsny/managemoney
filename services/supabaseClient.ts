
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

// ฟังก์ชันดึงค่าจาก env อย่างปลอดภัยสูงสุดเพื่อป้องกัน ReferenceError: process is not defined
const getSafeEnv = (key: string): string => {
  try {
    // ใช้ globalThis เพื่อเลี่ยงการอ้างอิงตรงที่อาจทำให้ JS Engine หยุดทำงาน
    const env = (globalThis as any).process?.env;
    if (env && env[key]) {
      return env[key] as string;
    }
  } catch (e) {
    console.warn(`Environment access error for ${key}:`, e);
  }
  return '';
};

const supabaseUrl = getSafeEnv('SUPABASE_URL');
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = () => {
  return typeof supabaseUrl === 'string' && 
         supabaseUrl.startsWith('https://') && 
         typeof supabaseAnonKey === 'string' && 
         supabaseAnonKey.length > 10;
};

// สร้าง Client แบบปลอดภัย
let supabaseInstance = null;
if (isSupabaseConfigured()) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
}

export const supabase = supabaseInstance;
