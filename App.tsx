
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, 
  PieChart as PieIcon, List, BrainCircuit,
  X, Trash2, Calendar, GraduationCap, CloudOff, RefreshCw, User, LogOut
} from 'lucide-react';
import { Transaction, Budget, TransactionType, AIInsight } from './types';
import { CATEGORIES, CATEGORY_COLORS } from './constants';
import { getFinancialInsights } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  // Authentication State
  const [session, setSession] = useState<any>(null);
  const [isInitialAuthChecked, setIsInitialAuthChecked] = useState(false);
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!isSupabaseConfigured());
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'ai'>('dashboard');
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form State
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES.expense[0]);
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. ตรวจสอบการ Login
  useEffect(() => {
    if (!supabase) {
      setIsInitialAuthChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. โหลดข้อมูล
  useEffect(() => {
    loadInitialData();
  }, [session]);

  const loadInitialData = async () => {
    setIsDataLoading(true);
    const userId = session?.user?.id || 'local-guest';

    // ดึงจาก Local ก่อนเสมอเพื่อให้แอปเร็ว
    const localTrans = localStorage.getItem(`trans_${userId}`);
    const localBudgets = localStorage.getItem(`budgets_${userId}`);
    
    if (localTrans) setTransactions(JSON.parse(localTrans));
    if (localBudgets) setBudgets(JSON.parse(localBudgets));
    else setBudgets(CATEGORIES.expense.map(c => ({ category: c, amount_limit: 3000 })));

    // ถ้ามี Supabase ให้ดึงข้อมูลมาทับ (Sync)
    if (supabase && session) {
      try {
        const { data: cloudTrans } = await supabase.from('transactions').select('*').order('date', { ascending: false });
        const { data: cloudBudgets } = await supabase.from('budgets').select('*');

        if (cloudTrans) {
          setTransactions(cloudTrans);
          localStorage.setItem(`trans_${userId}`, JSON.stringify(cloudTrans));
        }
        if (cloudBudgets && cloudBudgets.length > 0) {
          setBudgets(cloudBudgets);
          localStorage.setItem(`budgets_${userId}`, JSON.stringify(cloudBudgets));
        }
      } catch (e) {
        setIsOfflineMode(true);
      }
    }
    setIsDataLoading(false);
  };

  // Handlers
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(Number(formAmount))) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      type: formType,
      amount: Math.abs(Number(formAmount)),
      category: formCategory,
      description: formDesc || formCategory,
      date: formDate
    };

    const updated = [newTransaction, ...transactions];
    setTransactions(updated);
    localStorage.setItem(`trans_${session?.user?.id || 'local-guest'}`, JSON.stringify(updated));

    if (supabase && session) {
      await supabase.from('transactions').insert([{ ...newTransaction, user_id: session.user.id }]);
    }

    setIsModalOpen(false);
    setFormAmount('');
    setFormDesc('');
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem(`trans_${session?.user?.id || 'local-guest'}`, JSON.stringify(updated));

    if (supabase && session) {
      await supabase.from('transactions').delete().eq('id', id);
    }
  };

  const updateBudget = async (category: string, amount_limit: number) => {
    const updated = budgets.map(b => b.category === category ? { ...b, amount_limit } : b);
    setBudgets(updated);
    localStorage.setItem(`budgets_${session?.user?.id || 'local-guest'}`, JSON.stringify(updated));

    if (supabase && session) {
      await supabase.from('budgets').upsert({ user_id: session.user.id, category, amount_limit }, { onConflict: 'user_id,category' });
    }
  };

  // Calculations
  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    return { income, expenses, balance: income - expenses, savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0 };
  }, [transactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      data[t.category] = (data[t.category] || 0) + Number(t.amount);
    });
    return Object.keys(data).map(name => ({ name, value: data[name] }));
  }, [transactions]);

  const budgetProgressData = useMemo(() => {
    return budgets.map(b => {
      const spent = transactions.filter(t => t.type === 'expense' && t.category === b.category).reduce((sum, t) => sum + Number(t.amount), 0);
      return { category: b.category, spent, amount_limit: b.amount_limit, percentage: Math.min((spent / b.amount_limit) * 100, 100) };
    }).sort((a, b) => b.spent - a.spent);
  }, [transactions, budgets]);

  if (!isInitialAuthChecked) return <div className="min-h-screen flex items-center justify-center bg-indigo-600"><GraduationCap className="text-white animate-bounce" size={48} /></div>;

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64 bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-6 z-20">
        <div className="flex items-center gap-2 mb-10">
          <GraduationCap className="text-indigo-600" size={32} />
          <h1 className="text-xl font-bold">WealthWisely</h1>
        </div>
        <nav className="space-y-2 flex-1">
          <NavItem icon={<PieIcon size={20}/>} label="สรุปภาพรวม" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<List size={20}/>} label="รายการ" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
          <NavItem icon={<Calendar size={20}/>} label="งบประมาณ" active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} />
          <NavItem icon={<BrainCircuit size={20}/>} label="AI แนะนำ" active={activeTab === 'ai'} onClick={() => { setActiveTab('ai'); if(aiInsights.length === 0) getFinancialInsights(transactions, budgets).then(d => setAiInsights(d.insights)); }} />
        </nav>
        {isOfflineMode && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 text-amber-700 p-3 rounded-xl text-[10px] font-bold border border-amber-100">
            <CloudOff size={14} /> โหมดออฟไลน์ (บันทึกในเครื่อง)
          </div>
        )}
        <div className="bg-indigo-600 p-4 rounded-xl text-white shadow-lg">
          <p className="text-[10px] font-bold opacity-70 uppercase">ยอดคงเหลือ</p>
          <p className="text-2xl font-black">฿{summary.balance.toLocaleString()}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard title="รายรับ" amount={summary.income} icon={<TrendingUp className="text-emerald-500" />} />
              <SummaryCard title="รายจ่าย" amount={summary.expenses} icon={<TrendingDown className="text-rose-500" />} />
              <SummaryCard title="อัตราการออม" amount={summary.savingsRate} isPercent={true} icon={<Wallet className="text-indigo-500" />} />
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black mb-6">ภาพรวมรายจ่าย</h3>
              <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{categoryData.map((e, i) => <Cell key={i} fill={CATEGORY_COLORS[e.name] || '#cbd5e1'} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black">ประวัติการเงิน</h2><button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold">+ จดรายการ</button></div>
            <div className="bg-white rounded-[2rem] border border-slate-100 divide-y overflow-hidden shadow-sm">{transactions.map(t => <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />)}</div>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetProgressData.map(b => (
              <div key={b.category} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex justify-between mb-4"><div><h4 className="font-bold text-slate-800">{b.category}</h4><p className="text-xs text-slate-400">ใช้ไป ฿{b.spent.toLocaleString()} / ฿{b.amount_limit.toLocaleString()}</p></div><input type="number" className="w-20 bg-slate-50 border rounded-lg p-1 text-xs font-bold" value={b.amount_limit} onChange={(e) => updateBudget(b.category, Number(e.target.value))} /></div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${b.percentage > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${b.percentage}%` }} /></div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
             {aiInsights.map((insight, i) => (
               <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                 <div className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold mb-2 ${insight.priority === 'high' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>{insight.priority === 'high' ? 'สำคัญมาก' : 'คำแนะนำ'}</div>
                 <h3 className="text-lg font-black mb-2">{insight.title}</h3>
                 <p className="text-slate-500 text-sm leading-relaxed">{insight.recommendation}</p>
               </div>
             ))}
             <button onClick={() => { setIsAiLoading(true); getFinancialInsights(transactions, budgets).then(d => { setAiInsights(d.insights); setIsAiLoading(false); }); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2">{isAiLoading ? <RefreshCw className="animate-spin" /> : <BrainCircuit />} อัปเดตคำแนะนำ</button>
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-black">จดรายการใหม่</h3><button onClick={() => setIsModalOpen(false)}><X /></button></div>
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
               <div className="flex bg-slate-100 p-1 rounded-xl"><button type="button" onClick={() => setFormType('expense')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formType === 'expense' ? 'bg-white text-rose-500 shadow' : 'text-slate-500'}`}>จ่ายเงิน</button><button type="button" onClick={() => setFormType('income')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formType === 'income' ? 'bg-white text-emerald-500 shadow' : 'text-slate-500'}`}>ได้รับเงิน</button></div>
               <input type="number" required placeholder="จำนวนเงิน" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-3xl font-black focus:border-indigo-400 outline-none" />
               <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 px-4 font-bold">{CATEGORIES[formType].map(c => <option key={c} value={c}>{c}</option>)}</select>
               <input type="text" placeholder="จดสั้นๆ..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 px-4 font-bold" />
               <button type="submit" className={`w-full py-4 rounded-2xl font-black text-white shadow-xl ${formType === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}>บันทึก</button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 z-30 shadow-2xl">
        <MobileNavItem icon={<PieIcon />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<List />} active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white p-3 rounded-full -mt-8 shadow-lg ring-4 ring-white"><Plus /></button>
        <MobileNavItem icon={<Calendar />} active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} />
        <MobileNavItem icon={<BrainCircuit />} active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
      </nav>
    </div>
  );
};

// Sub Components
const NavItem = ({ icon, label, active, onClick }: any) => <button onClick={onClick} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{icon}<span className="text-sm">{label}</span></button>;
const MobileNavItem = ({ icon, active, onClick }: any) => <button onClick={onClick} className={`p-3 rounded-xl ${active ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}>{icon}</button>;
const SummaryCard = ({ title, amount, icon, isPercent }: any) => <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm"><div className="flex justify-between items-center mb-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>{icon}</div><p className="text-xl font-black">{isPercent ? `${amount.toFixed(1)}%` : `฿${amount.toLocaleString()}`}</p></div>;
const TransactionItem = ({ transaction, onDelete }: any) => <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-all"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>{transaction.type === 'income' ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}</div><div><p className="font-bold text-sm leading-none mb-1">{transaction.description}</p><p className="text-[10px] text-slate-400 uppercase font-black">{transaction.category} • {new Date(transaction.date).toLocaleDateString('th-TH')}</p></div></div><div className="flex items-center gap-3"><p className={`font-black ${transaction.type === 'income' ? 'text-emerald-500' : 'text-slate-800'}`}>{transaction.type === 'income' ? '+' : '-'}฿{Number(transaction.amount).toLocaleString()}</p><button onClick={() => onDelete(transaction.id)} className="text-slate-200 hover:text-rose-500"><Trash2 size={14} /></button></div></div>;

export default App;
