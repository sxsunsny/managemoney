
import React from 'react';

export const CATEGORIES = {
  th: {
    expense: [
      'ค่าอาหารและเครื่องดื่ม', 
      'อุปกรณ์การเรียน/หนังสือ', 
      'ค่าเดินทาง', 
      'ค่าหอพัก/ที่พัก', 
      'ค่าเทอม/กิจกรรมคณะ', 
      'สังสรรค์/ความบันเทิง', 
      'ช้อปปิ้ง/เสื้อผ้า', 
      'ของใช้ส่วนตัว', 
      'เกม/สตรีมมิ่ง', 
      'อื่นๆ'
    ],
    income: [
      'ค่าขนมจากที่บ้าน', 
      'งานพาร์ทไทม์', 
      'ทุนการศึกษา', 
      'รางวัล/ของขวัญ', 
      'เงินคืน/Cashback', 
      'อื่นๆ'
    ]
  },
  en: {
    expense: [
      'Food & Drinks',
      'Study Materials',
      'Transportation',
      'Housing/Rent',
      'Tuition/Activities',
      'Social/Entertainment',
      'Shopping/Clothes',
      'Personal Care',
      'Gaming/Streaming',
      'Others'
    ],
    income: [
      'Allowance',
      'Part-time Job',
      'Scholarship',
      'Gifts/Rewards',
      'Cashback',
      'Others'
    ]
  }
};

export const CATEGORY_COLORS: Record<string, string> = {
  // Thai
  'ค่าอาหารและเครื่องดื่ม': '#f59e0b',
  'อุปกรณ์การเรียน/หนังสือ': '#3b82f6',
  'ค่าเดินทาง': '#10b981',
  'ค่าหอพัก/ที่พัก': '#6366f1',
  'ค่าเทอม/กิจกรรมคณะ': '#ec4899',
  'สังสรรค์/ความบันเทิง': '#8b5cf6',
  'ช้อปปิ้ง/เสื้อผ้า': '#f43f5e',
  'ของใช้ส่วนตัว': '#14b8a6',
  'เกม/สตรีมมิ่ง': '#0ea5e9',
  'อื่นๆ': '#94a3b8',
  'ค่าขนมจากที่บ้าน': '#10b981',
  'งานพาร์ทไทม์': '#8b5cf6',
  'ทุนการศึกษา': '#f59e0b',
  'รางวัล/ของขวัญ': '#ec4899',
  'เงินคืน/Cashback': '#06b6d4',
  // English
  'Food & Drinks': '#f59e0b',
  'Study Materials': '#3b82f6',
  'Transportation': '#10b981',
  'Housing/Rent': '#6366f1',
  'Tuition/Activities': '#ec4899',
  'Social/Entertainment': '#8b5cf6',
  'Shopping/Clothes': '#f43f5e',
  'Personal Care': '#14b8a6',
  'Gaming/Streaming': '#0ea5e9',
  'Allowance': '#10b981',
  'Part-time Job': '#8b5cf6',
  'Scholarship': '#f59e0b',
  'Gifts/Rewards': '#ec4899',
  'Cashback': '#06b6d4'
};
