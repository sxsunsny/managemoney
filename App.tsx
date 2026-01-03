
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, 
  PieChart as PieIcon, List, BrainCircuit,
  X, Trash2, Calendar, GraduationCap, LogIn, LogOut, User, RefreshCw, ChevronDown, CloudOff, Cloud
} from 'lucide-react';
import { Transaction, Budget, TransactionType, AIInsight } from './types';
import { CATEGORIES, CATEGORY_COLORS } from './constants';
import { getFinancialInsights } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  // Authentication State
  const [session, setSession] = useState<any>(null);
  const [isInitialAuthChecked, setIsInitialAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userStatus, setUserStatus] = useState('นักศึกษาปี 1');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  // App Data State
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

  // 1. ตรวจสอบสถานะการล็อกอินครั้งแรก
  useEffect(() => {
    if (!supabase) {
      setIsInitialAuthChecked(true);
      const localUser = localStorage.getItem('wealthwisely_local_user');
      if (localUser) setSession(JSON.parse(localUser));
      return;
    }

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (e) {
        console.warn('Auth session check failed, using local');
      } finally {
        setIsInitialAuthChecked(true);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. จัดการการโหลดข้อมูล
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, isOfflineMode]);

  const fetchData = async () => {
    setIsDataLoading(true);
    const userId = session?.user?.id || 'local';
    
    // ดึงข้อมูลจาก LocalStorage ไว้ก่อนเสมอ
    const savedTrans = localStorage.getItem(`ww_trans_${userId}`);
    const savedBudgets = localStorage.getItem(`ww_budgets_${userId}`);
    
    if (savedTrans) setTransactions(JSON.parse(savedTrans));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
    else if (budgets.length === 0) setBudgets(CATEGORIES.expense.map(c => ({ category: c, amount_limit: 3000 })));

    if (!isOfflineMode && supabase) {
      try {
        const [transRes, budgetRes] = await Promise.all([
          supabase.from('transactions').select('*').order('date', { ascending: false }),
          supabase.from('budgets').select('*')
        ]);

        if (transRes.data) {
          setTransactions(transRes.data);
          localStorage.setItem(`ww_trans_${userId}`, JSON.stringify(transRes.data));
        }
        if (budgetRes.data && budgetRes.data.length > 0) {
          setBudgets(budgetRes.data);
          localStorage.setItem(`ww_budgets_${userId}`, JSON.stringify(budgetRes.data));
        }
      } catch (error) {
        console.error('Fetch error, switching to offline mode:', error);
        setIsOfflineMode(true);
      }
    }
    setIsDataLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);

    if (!supabase) {
      const mockSession = {
        user: {
          id: 'demo-user-id',
          email: authEmail,
          user_metadata: { first_name: firstName || 'ผู้ใช้งาน', last_name: lastName || 'ทดลอง', status: userStatus }
        }
      };
      setSession(mockSession);
      localStorage.setItem('wealthwisely_local_user', JSON.stringify(mockSession));
      setIsAuthLoading(false);
      return;
    }

    try {
      if (authView === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        if (data.session) setSession(data.session);
      } else {
        const { error } = await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPassword,
          options: { data: { first_name: firstName, last_name: lastName, status: userStatus } }
        });
        if (error) throw error;
        alert('สร้างบัญชีสำเร็จ!');
      }
    } catch (error: any) {
      alert('ข้อผิดพลาด: ' + (error.message === 'Failed to fetch' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : error.message));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('wealthwisely_local_user');
    setSession(null);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(Number(formAmount)) || !session) return;
    
    const newTransaction = { 
      id: crypto.randomUUID(),
      user_id: session.user.id, 
      type: formType, 
      amount: Math.abs(Number(formAmount)), 
      category: formCategory, 
      description: formDesc || formCategory, 
      date: formDate 
    };

    const updated = [newTransaction, ...transactions];
    setTransactions(updated);
    localStorage.setItem(`ww_trans_${session.user.id}`, JSON.stringify(updated));

    if (!isOfflineMode && supabase) {
      try {
        await supabase.from('transactions').insert([newTransaction]);
      } catch (e) {
        console.warn('Sync to cloud failed');
      }
    }
    
    setIsModalOpen(false);
    setFormAmount('');
    setFormDesc('');
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem(`ww_trans_${session?.user?.id}`, JSON.stringify(updated));

    if (!isOfflineMode && supabase) {
      try {
        await supabase.from('transactions').delete().eq('id', id);
      } catch (e) {
        console.warn('Delete failed');
      }
    }
  };

  const updateBudget = async (category: string, amount_limit: number) => {
    if (!session) return;
    const updatedBudgets = budgets.map(b => b.category === category ? { ...b, amount_limit } : b);
    setBudgets(updatedBudgets);
    localStorage.setItem(`ww_budgets_${session.user.id}`, JSON.stringify(updatedBudgets));
    
    if (!isOfflineMode && supabase) {
      try {
        await supabase.from('budgets').upsert({ user_id: session.user.id, category, amount_limit }, { onConflict: 'user_id,category' });
      } catch (e) {
        console.warn('Budget sync failed');
      }
    }
  };

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

  const fetchAIInsights = async () => {
    setIsAiLoading(true); setActiveTab('ai');
    try { 
      const data = await getFinancialInsights(transactions, budgets); 
      setAiInsights(data.insights); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsAiLoading(false); 
    }
  };

  if (!isInitialAuthChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-600">
        <GraduationCap className="text-white animate-bounce mb-4" size={64} />
        <p className="text-white font-black tracking-widest uppercase">WealthWisely</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-4">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[95vh]">
          <div className="text-center mb-8">
            <div className="bg-indigo-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="text-indigo-600" size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-800">WealthWisely</h1>
            <p className="text-slate-500 text-sm mt-2">จดบันทึกรายรับ-รายจ่าย รายเดือน</p>
            {isOfflineMode && (
              <div className="mt-3 bg-amber-50 text-amber-700 text-[10px] font-bold py-2 px-3 rounded-xl border border-amber-100 flex items-center justify-center gap-2">
                <CloudOff size={14} /> โหมด Offline (บันทึกในเครื่อง)
              </div>
            )}
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authView === 'signup' && (
              <div className="grid grid-cols-2 gap-4">
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="ชื่อ" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3 px-5 focus:border-indigo-400 outline-none transition-all text-sm" />
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="นามสกุล" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3 px-5 focus:border-indigo-400 outline-none transition-all text-sm" />
              </div>
            )}
            <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="อีเมล" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3 px-5 focus:border-indigo-400 outline-none transition-all text-sm" />
            <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="รหัสผ่าน" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3 px-5 focus:border-indigo-400 outline-none transition-all text-sm" />
            <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-indigo-600 text-white rounded-[1.2rem] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              {isAuthLoading ? <RefreshCw className="animate-spin" size={20} /> : (authView === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
            </button>
          </form>
          <button onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')} className="w-full mt-6 text-sm font-bold text-indigo-500 hover:underline text-center">
            {authView === 'login' ? 'ยังไม่มีบัญชี? สมัครที่นี่' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64 bg-slate-50 text-slate-900">
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-6 z-20">
        <div className="flex items-center gap-2 mb-10"><GraduationCap className="text-indigo-600" size={28} /><h1 className="text-xl font-bold tracking-tight text-slate-800">WealthWisely</h1></div>
        <nav className="space-y-2 flex-1">
          <NavItem icon={<PieIcon size={20}/>} label="สรุปภาพรวม" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<List size={20}/>} label="ประวัติการเงิน" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
          <NavItem icon={<Calendar size={20}/>} label="งบรายเดือน" active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} />
          <NavItem icon={<BrainCircuit size={20}/>} label="AI ช่วยวางแผน" active={activeTab === 'ai'} onClick={fetchAIInsights} />
        </nav>
        <div className="mt-auto space-y-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"><User size={20} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 truncate leading-tight">{firstName || 'ผู้ใช้งาน'}</p>
              <button onClick={handleSignOut} className="text-[10px] font-black text-rose-500 uppercase hover:underline flex items-center gap-1 mt-1">ออกจากระบบ <LogOut size={10} /></button>
            </div>
          </div>
          <div className="bg-indigo-600 p-4 rounded-xl shadow-xl shadow-indigo-100"><p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">ยอดคงเหลือ</p><p className="text-2xl font-black text-white">฿{summary.balance.toLocaleString()}</p></div>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-30 shadow-2xl">
        <MobileNavItem icon={<PieIcon size={24}/>} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<List size={24}/>} active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white p-4 rounded-full -mt-10 shadow-xl ring-4 ring-white active:scale-90 transition-transform"><Plus size={24} /></button>
        <MobileNavItem icon={<Calendar size={24}/>} active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} />
        <MobileNavItem icon={<BrainCircuit size={24}/>} active={activeTab === 'ai'} onClick={fetchAIInsights} />
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView summary={summary} categoryData={categoryData} budgetProgressData={budgetProgressData} transactions={transactions} deleteTransaction={deleteTransaction} setActiveTab={setActiveTab} />}
        {activeTab === 'transactions' && <TransactionsView transactions={transactions} deleteTransaction={deleteTransaction} setIsModalOpen={setIsModalOpen} />}
        {activeTab === 'budgets' && <BudgetsView budgetProgressData={budgetProgressData} updateBudget={updateBudget} />}
        {activeTab === 'ai' && <AIView isAiLoading={isAiLoading} aiInsights={aiInsights} fetchAIInsights={fetchAIInsights} />}
      </main>

      {isModalOpen && (
        <TransactionModal 
          isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddTransaction} 
          formType={formType} setFormType={setFormType} formAmount={formAmount} setFormAmount={setFormAmount}
          formCategory={formCategory} setFormCategory={setFormCategory} formDesc={formDesc} setFormDesc={setFormDesc}
          formDate={formDate} setFormDate={setFormDate}
        />
      )}
    </div>
  );
};

const DashboardView = ({ summary, categoryData, budgetProgressData, transactions, deleteTransaction, setActiveTab }: any) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SummaryCard title="รายรับทั้งหมด" amount={summary.income} icon={<TrendingUp className="text-emerald-500" />} color="bg-white border-emerald-100" />
      <SummaryCard title="รายจ่ายทั้งหมด" amount={summary.expenses} icon={<TrendingDown className="text-rose-500" />} color="bg-white border-rose-100" />
      <SummaryCard title="อัตราการออม" amount={summary.savingsRate} isPercent={true} icon={<Wallet className="text-indigo-500" />} color="bg-white border-indigo-100" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="ภาพรวมการใช้จ่าย"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{categoryData.map((e: any, i: number) => <Cell key={i} fill={CATEGORY_COLORS[e.name] || '#94a3b8'} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></Card>
      <Card title="ความคืบหน้างบประมาณ"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={budgetProgressData.slice(0, 5)} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="category" type="category" width={100} tick={{fontSize: 10}} /><Tooltip /><Bar dataKey="spent" name="ใช้ไป" fill="#4f46e5" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></Card>
    </div>
    <Card title="รายการล่าสุด" action={<button onClick={() => setActiveTab('transactions')} className="text-indigo-600 text-sm font-bold">ดูทั้งหมด</button>}>
      <div className="divide-y divide-slate-100">
        {transactions.slice(0, 5).map((t: any) => <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />)}
        {transactions.length === 0 && <p className="text-slate-400 text-center py-10 italic">ยังไม่มีข้อมูล...</p>}
      </div>
    </Card>
  </div>
);

const TransactionsView = ({ transactions, deleteTransaction, setIsModalOpen }: any) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800">ประวัติการเงิน</h2><button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg">+ จดรายการ</button></div>
    <Card><div className="divide-y divide-slate-100">{transactions.map((t: any) => <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />)}</div></Card>
  </div>
);

const BudgetsView = ({ budgetProgressData, updateBudget }: any) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-black text-slate-800">งบประมาณรายเดือน</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {budgetProgressData.map((b: any) => (
        <Card key={b.category}>
          <div className="flex justify-between items-start mb-4">
            <div><h3 className="font-bold text-slate-800">{b.category}</h3><p className="text-slate-400 text-xs">฿{b.spent.toLocaleString()} / ฿{b.amount_limit.toLocaleString()}</p></div>
            <input type="number" value={b.amount_limit} onChange={(e) => updateBudget(b.category, Number(e.target.value))} className="w-20 bg-slate-50 border rounded-lg px-2 py-1 text-xs font-bold" />
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${b.percentage >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${b.percentage}%` }} /></div>
        </Card>
      ))}
    </div>
  </div>
);

const AIView = ({ isAiLoading, aiInsights, fetchAIInsights }: any) => (
  <div className="space-y-6">
    <div className="flex items-center gap-4"><div className="bg-indigo-600 p-4 rounded-3xl"><BrainCircuit className="text-white" size={32} /></div><div><h2 className="text-2xl font-black text-slate-800">ที่ปรึกษา AI</h2><p className="text-slate-500 text-sm">วิเคราะห์วินัยการเงินของคุณ</p></div></div>
    {isAiLoading ? (
      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-indigo-200">
        <RefreshCw className="animate-spin text-indigo-600 mx-auto mb-4" size={32} />
        <p className="text-indigo-600 font-bold animate-pulse">น้อง AI กำลังวิเคราะห์ข้อมูลของคุณ...</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {aiInsights.map((insight: any, idx: number) => <InsightCard key={idx} insight={insight} />)}
        {aiInsights.length === 0 && <div className="col-span-3 py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-400">กดปุ่มด้านล่างเพื่อขอรับคำแนะนำ</div>}
      </div>
    )}
    <button onClick={fetchAIInsights} disabled={isAiLoading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-2"><BrainCircuit size={20} /> วิเคราะห์ด้วย AI</button>
  </div>
);

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{icon}<span className="text-sm">{label}</span></button>
);

const MobileNavItem = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`p-3.5 rounded-2xl transition-all ${active ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}>{icon}</button>
);

const SummaryCard = ({ title, amount, icon, color, isPercent }: any) => (
  <div className={`p-6 rounded-3xl border-2 shadow-sm transition-all hover:shadow-md ${color}`}>
    <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>{icon}</div>
    <p className="text-2xl font-black text-slate-900">{isPercent ? `${amount.toFixed(1)}%` : `฿${amount.toLocaleString()}`}</p>
  </div>
);

const Card = ({ title, action, children }: any) => (
  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm h-full">
    {(title || action) && <div className="flex justify-between items-center mb-6">{title && <h3 className="text-lg font-black text-slate-800">{title}</h3>}{action && action}</div>}
    {children}
  </div>
);

const TransactionItem = ({ transaction, onDelete }: any) => (
  <div className="group flex items-center justify-between py-3 hover:bg-indigo-50/40 px-3 -mx-3 rounded-2xl transition-all">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${transaction.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{transaction.type === 'income' ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}</div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm leading-tight">{transaction.description}</h4>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1"><span className="bg-slate-100 px-1.5 py-0.5 rounded">{transaction.category}</span><span>•</span><span>{new Date(transaction.date).toLocaleDateString('th-TH')}</span></div>
      </div>
    </div>
    <div className="flex items-center gap-3 text-right">
      <p className={`font-black text-sm ${transaction.type === 'income' ? 'text-emerald-500' : 'text-slate-800'}`}>{transaction.type === 'income' ? '+' : '-'}฿{Number(transaction.amount).toLocaleString()}</p>
      <button onClick={() => onDelete(transaction.id)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
    </div>
  </div>
);

const InsightCard = ({ insight }: any) => (
  <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm relative overflow-hidden h-full flex flex-col group hover:shadow-lg transition-all">
    <div className="absolute top-0 right-0 h-1 w-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div className={`self-start px-2 py-0.5 rounded-full text-[9px] font-black uppercase mb-4 border ${insight.priority === 'high' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>{insight.priority === 'high' ? 'แนะนำด่วน' : 'เกร็ดความรู้'}</div>
    <h3 className="font-black text-lg mb-2 text-slate-800 leading-tight">{insight.title}</h3>
    <p className="text-slate-500 text-xs leading-relaxed flex-grow">{insight.recommendation}</p>
  </div>
);

const TransactionModal = ({ isOpen, onClose, onSubmit, formType, setFormType, formAmount, setFormAmount, formCategory, setFormCategory, formDesc, setFormDesc, formDate, setFormDate }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
      <div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-black text-slate-800">จดรายการใหม่</h3><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button></div>
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button type="button" onClick={() => {setFormType('expense'); setFormCategory(CATEGORIES.expense[0]);}} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${formType === 'expense' ? 'bg-white text-rose-500 shadow' : 'text-slate-500'}`}>จ่ายเงิน</button>
          <button type="button" onClick={() => {setFormType('income'); setFormCategory(CATEGORIES.income[0]);}} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${formType === 'income' ? 'bg-white text-emerald-500 shadow' : 'text-slate-500'}`}>ได้รับเงิน</button>
        </div>
        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">จำนวนเงิน (บาท)</label><input type="number" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-3xl font-black focus:border-indigo-400 outline-none transition-all" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">หมวดหมู่</label><select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 px-3 text-xs font-bold outline-none">{CATEGORIES[formType as TransactionType].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">วันที่</label><input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 px-3 text-xs font-bold outline-none" /></div>
        </div>
        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">บันทึกช่วยจำ</label><input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="เช่น มื้อเที่ยงคณะ..." className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none" /></div>
        <button type="submit" className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${formType === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}>บันทึกรายการ</button>
      </form>
    </div>
  </div>
);

export default App;
