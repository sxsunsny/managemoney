
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, 
  PieChart as PieIcon, List, BrainCircuit,
  X, Trash2, Calendar, GraduationCap, RefreshCw,
  Sun, Moon, Languages
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Constants & Config ---
const CATEGORIES = {
  th: {
    expense: ['ค่าอาหาร', 'อุปกรณ์การเรียน', 'ค่าเดินทาง', 'ค่าที่พัก', 'ค่าเทอม', 'สังสรรค์', 'ช้อปปิ้ง', 'ของใช้ส่วนตัว', 'อื่นๆ'],
    income: ['ค่าขนม', 'งานพิเศษ', 'ทุนการศึกษา', 'รางวัล', 'อื่นๆ']
  },
  en: {
    expense: ['Food', 'Study', 'Transport', 'Housing', 'Tuition', 'Social', 'Shopping', 'Personal', 'Others'],
    income: ['Allowance', 'Job', 'Scholarship', 'Gifts', 'Others']
  }
};

const TRANSLATIONS = {
  th: {
    dashboard: 'หน้าแรก', history: 'รายการ', budgets: 'งบประมาณ', aiAdvice: 'AI แนะนำ',
    balance: 'เงินคงเหลือ', income: 'รายรับ', expenses: 'รายจ่าย', savings: 'การออม',
    greet: 'สวัสดีจ้า 👋', subGreet: 'วันนี้เป็นอย่างไรบ้าง?', recent: 'ล่าสุด',
    proportion: 'สัดส่วนรายจ่าย', noRec: 'ไม่มีข้อมูล', addBtn: '+ เพิ่มรายการ',
    empty: 'ยังไม่มีข้อมูล', setBudget: 'งบประมาณ', used: 'ใช้ไป', overBudget: 'เกินงบ!',
    aiConsult: 'AI วิเคราะห์เงิน', analyzeBtn: 'ให้ AI ช่วยดู', analyzing: 'กำลังคิด...',
    record: 'บันทึกรายการ', amt: 'จำนวนเงิน', cat: 'หมวดหมู่', date: 'วันที่', save: 'บันทึก',
    pay: 'รายจ่าย', receive: 'รายรับ'
  },
  en: {
    dashboard: 'Dashboard', history: 'History', budgets: 'Budgets', aiAdvice: 'AI Tips',
    balance: 'Balance', income: 'Income', expenses: 'Expenses', savings: 'Savings',
    greet: 'Hello! 👋', subGreet: 'How is it going?', recent: 'Recent',
    proportion: 'Expenses', noRec: 'No data', addBtn: '+ Add New',
    empty: 'Start recording!', setBudget: 'Budgets', used: 'Used', overBudget: 'Over!',
    aiConsult: 'AI Consultant', analyzeBtn: 'Analyze', analyzing: 'Thinking...',
    record: 'New Record', amt: 'Amount', cat: 'Category', date: 'Date', save: 'Save',
    pay: 'Expense', receive: 'Income'
  }
};

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const App: React.FC = () => {
  const [lang, setLang] = useState<'th' | 'en'>(() => (localStorage.getItem('ww_lang') as any) || 'th');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('ww_theme') as any) || 'dark');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form State
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');

  const t = TRANSLATIONS[lang];
  const isDark = theme === 'dark';

  useEffect(() => {
    const saved = localStorage.getItem('ww_transactions');
    if (saved) setTransactions(JSON.parse(saved));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('ww_transactions', JSON.stringify(transactions));
  }, [transactions, isLoaded]);

  useEffect(() => { localStorage.setItem('ww_lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('ww_theme', theme); }, [theme]);

  const summary = useMemo(() => {
    const inc = transactions.filter(tr => tr.type === 'income').reduce((s, tr) => s + Number(tr.amount), 0);
    const exp = transactions.filter(tr => tr.type === 'expense').reduce((s, tr) => s + Number(tr.amount), 0);
    return { inc, exp, bal: inc - exp };
  }, [transactions]);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.filter(tr => tr.type === 'expense').forEach(tr => {
      data[tr.category] = (data[tr.category] || 0) + Number(tr.amount);
    });
    return Object.keys(data).map(name => ({ name, value: data[name] }));
  }, [transactions]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount) return;
    const newTr = {
      id: Date.now().toString(),
      type: formType,
      amount: Number(formAmount),
      category: formCategory || CATEGORIES[lang][formType][0],
      date: new Date().toISOString()
    };
    setTransactions([newTr, ...transactions]);
    setIsModalOpen(false);
    setFormAmount('');
  };

  const handleAI = async () => {
    setIsAiLoading(true);
    setActiveTab('ai');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze my financial transactions: ${JSON.stringify(transactions)}. Provide 3 tips in Thai as JSON array called insights with keys title and recommendation.`
      });
      const data = JSON.parse(response.text || '{"insights":[]}');
      setAiInsights(data.insights || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} pb-20 lg:pb-0 lg:pl-64 transition-all`}>
      {/* Desktop Sidebar */}
      <aside className={`fixed hidden lg:flex flex-col w-64 h-full border-r p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-10 text-indigo-500 font-bold text-xl">
          <GraduationCap /> WealthWisely
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<PieIcon size={20}/>} label={t.dashboard} />
          <SidebarBtn active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<List size={20}/>} label={t.history} />
          <SidebarBtn active={activeTab === 'ai'} onClick={handleAI} icon={<BrainCircuit size={20}/>} label={t.aiAdvice} />
        </nav>
        <div className="mt-auto space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="flex-1 p-2 bg-slate-800 rounded-lg flex justify-center"><Sun size={18}/></button>
            <button onClick={() => setLang(lang === 'th' ? 'en' : 'th')} className="flex-1 p-2 bg-slate-800 rounded-lg text-xs font-bold uppercase">{lang}</button>
          </div>
          <div className="bg-indigo-600 p-4 rounded-xl">
            <p className="text-[10px] opacity-70 uppercase">{t.balance}</p>
            <p className="text-xl font-bold">฿{summary.bal.toLocaleString()}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-4xl mx-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">{t.greet}</h1>
              <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/20">{t.addBtn}</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card title={t.income} val={summary.inc} color="text-emerald-500" icon={<TrendingUp/>}/>
              <Card title={t.expenses} val={summary.exp} color="text-rose-500" icon={<TrendingDown/>}/>
              <Card title={t.balance} val={summary.bal} color="text-indigo-400" icon={<Wallet/>}/>
            </div>

            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="font-bold mb-4">{t.proportion}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t.history}</h2>
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
              {transactions.length > 0 ? transactions.map(tr => (
                <div key={tr.id} className="flex justify-between p-4 border-b border-slate-800 last:border-none items-center">
                  <div>
                    <p className="text-sm font-bold">{tr.category}</p>
                    <p className="text-[10px] opacity-40">{new Date(tr.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`font-bold ${tr.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tr.type === 'income' ? '+' : '-'}฿{tr.amount.toLocaleString()}
                    </p>
                    <button onClick={() => setTransactions(transactions.filter(x => x.id !== tr.id))} className="text-slate-600"><Trash2 size={16}/></button>
                  </div>
                </div>
              )) : <p className="p-10 text-center opacity-40">{t.empty}</p>}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">{t.aiConsult}</h2>
            {isAiLoading ? (
              <div className="p-20 flex flex-col items-center gap-4">
                <RefreshCw className="animate-spin text-indigo-500" size={40}/>
                <p>{t.analyzing}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {aiInsights.map((ins, i) => (
                  <div key={i} className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                    <h4 className="font-bold text-indigo-400 mb-2">{ins.title}</h4>
                    <p className="text-sm opacity-70">{ins.recommendation}</p>
                  </div>
                ))}
                <button onClick={handleAI} className="w-full bg-indigo-600 py-4 rounded-xl font-bold">{t.analyzeBtn}</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className={`w-full max-w-sm p-6 rounded-3xl ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between mb-6">
              <h3 className="font-bold">{t.record}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)}><X/></button>
            </div>
            <div className="flex bg-slate-800 p-1 rounded-xl mb-4">
              <button type="button" onClick={() => setFormType('expense')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formType === 'expense' ? 'bg-indigo-600' : 'opacity-40'}`}>{t.pay}</button>
              <button type="button" onClick={() => setFormType('income')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formType === 'income' ? 'bg-indigo-600' : 'opacity-40'}`}>{t.receive}</button>
            </div>
            <input type="number" placeholder="0.00" autoFocus required className="w-full bg-slate-800/50 p-4 rounded-xl text-2xl font-bold mb-4 outline-none" value={formAmount} onChange={e => setFormAmount(e.target.value)}/>
            <select className="w-full bg-slate-800/50 p-4 rounded-xl mb-6 outline-none text-sm" onChange={e => setFormCategory(e.target.value)}>
              {CATEGORIES[lang][formType].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-bold">{t.save}</button>
          </form>
        </div>
      )}

      {/* Mobile Nav */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex justify-around items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
        <MobileBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<PieIcon/>}/>
        <MobileBtn active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<List/>}/>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white p-3 rounded-full -mt-10 shadow-lg"><Plus size={24}/></button>
        <MobileBtn active={activeTab === 'ai'} onClick={handleAI} icon={<BrainCircuit/>}/>
        <button onClick={() => setLang(lang === 'th' ? 'en' : 'th')} className="text-xs font-bold uppercase">{lang}</button>
      </nav>
    </div>
  );
};

const SidebarBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
    {icon} <span className="text-sm font-medium">{label}</span>
  </button>
);

const MobileBtn = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={active ? 'text-indigo-500' : 'opacity-40'}>{icon}</button>
);

const Card = ({ title, val, color, icon }: any) => (
  <div className={`p-6 rounded-3xl border bg-slate-900/50 border-slate-800`}>
    <p className="text-[10px] uppercase opacity-50 mb-2">{title}</p>
    <div className={`flex items-center gap-2 ${color}`}>
      {icon} <span className="text-xl font-bold">฿{val.toLocaleString()}</span>
    </div>
  </div>
);

export default App;
