
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, 
  PieChart as PieIcon, List, BrainCircuit,
  X, Trash2, Calendar, GraduationCap, RefreshCw
} from 'lucide-react';
import { Transaction, Budget, TransactionType, AIInsight } from './types';
import { CATEGORIES, CATEGORY_COLORS } from './constants';
import { getFinancialInsights } from './services/geminiService';

const App: React.FC = () => {
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
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

  // 1. โหลดข้อมูลจาก LocalStorage เมื่อเปิดแอป
  useEffect(() => {
    const localTrans = localStorage.getItem('ww_transactions');
    const localBudgets = localStorage.getItem('ww_budgets');
    
    if (localTrans) {
      setTransactions(JSON.parse(localTrans));
    }
    
    if (localBudgets) {
      setBudgets(JSON.parse(localBudgets));
    } else {
      // ตั้งค่าเริ่มต้นสำหรับงบประมาณถ้ายังไม่มีข้อมูล
      const defaultBudgets = CATEGORIES.expense.map(c => ({ category: c, amount_limit: 3000 }));
      setBudgets(defaultBudgets);
      localStorage.setItem('ww_budgets', JSON.stringify(defaultBudgets));
    }
    
    setIsDataLoading(false);
  }, []);

  // 2. บันทึกข้อมูลลง LocalStorage ทุกครั้งที่เปลี่ยน
  useEffect(() => {
    if (!isDataLoading) {
      localStorage.setItem('ww_transactions', JSON.stringify(transactions));
    }
  }, [transactions, isDataLoading]);

  useEffect(() => {
    if (!isDataLoading) {
      localStorage.setItem('ww_budgets', JSON.stringify(budgets));
    }
  }, [budgets, isDataLoading]);

  // Handlers
  const handleAddTransaction = (e: React.FormEvent) => {
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

    setTransactions([newTransaction, ...transactions]);
    setIsModalOpen(false);
    setFormAmount('');
    setFormDesc('');
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const updateBudget = (category: string, amount_limit: number) => {
    setBudgets(budgets.map(b => b.category === category ? { ...b, amount_limit } : b));
  };

  const handleFetchAI = async () => {
    setIsAiLoading(true);
    setActiveTab('ai');
    try {
      const data = await getFinancialInsights(transactions, budgets);
      setAiInsights(data.insights);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Calculations
  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    return { 
      income, 
      expenses, 
      balance: income - expenses, 
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0 
    };
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
      return { 
        category: b.category, 
        spent, 
        amount_limit: b.amount_limit, 
        percentage: Math.min((spent / b.amount_limit) * 100, 100) 
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [transactions, budgets]);

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-600">
        <GraduationCap className="text-white animate-bounce mb-4" size={64} />
        <p className="text-white/70 font-bold animate-pulse">กำลังเตรียมห้องสมุดการเงิน...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64 bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-8 z-20">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100 text-white">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-800">WealthWisely</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavItem icon={<PieIcon size={20}/>} label="สรุปภาพรวม" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<List size={20}/>} label="รายการย้อนหลัง" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
          <NavItem icon={<Calendar size={20}/>} label="งบประมาณ" active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} />
          <NavItem icon={<BrainCircuit size={20}/>} label="AI แนะนำ" active={activeTab === 'ai'} onClick={handleFetchAI} />
        </nav>
        
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-2xl">
          <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">เงินคงเหลือ</p>
          <p className="text-2xl font-black">฿{summary.balance.toLocaleString()}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 md:p-12">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <header>
              <h2 className="text-3xl font-black text-slate-800">สวัสดีจ้า</h2>
              <p className="text-slate-500 font-medium">วันนี้วางแผนการเงินหรือยัง?</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard title="รายรับ" amount={summary.income} icon={<TrendingUp className="text-emerald-500" />} color="emerald" />
              <SummaryCard title="รายจ่าย" amount={summary.expenses} icon={<TrendingDown className="text-rose-500" />} color="rose" />
              <SummaryCard title="เงินออม" amount={summary.savingsRate} isPercent={true} icon={<Wallet className="text-indigo-500" />} color="indigo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="text-lg font-black mb-8">สัดส่วนรายจ่าย</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                        {categoryData.map((e, i) => <Cell key={i} fill={CATEGORY_COLORS[e.name] || '#cbd5e1'} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <h3 className="text-lg font-black mb-6">รายการล่าสุด</h3>
                <div className="space-y-1">
                  {transactions.slice(0, 5).map(t => <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />)}
                  {transactions.length === 0 && <p className="text-center py-12 text-slate-300 font-bold italic">ยังไม่มีบันทึกวันนี้</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">ประวัติการเงิน</h2>
              <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">
                + จดรายการ
              </button>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 divide-y overflow-hidden shadow-sm">
              {transactions.length > 0 ? (
                transactions.map(t => <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />)
              ) : (
                <div className="p-24 text-center text-slate-300 font-black italic">ความว่างเปล่า... เริ่มจดกันเลย!</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">ตั้งงบรายเดือน</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgetProgressData.map(b => (
                <div key={b.category} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 transition-all hover:shadow-md">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <h4 className="font-black text-slate-800 text-lg leading-tight">{b.category}</h4>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        ใช้ไป ฿{b.spent.toLocaleString()} / ฿{b.amount_limit.toLocaleString()}
                      </p>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="w-24 bg-slate-50 border-2 border-slate-50 focus:border-indigo-100 rounded-xl p-2 text-sm font-black text-center outline-none transition-all" 
                        value={b.amount_limit} 
                        onChange={(e) => updateBudget(b.category, Number(e.target.value))} 
                      />
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${b.percentage > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${b.percentage}%` }} 
                    />
                  </div>
                  {b.percentage >= 100 && <p className="text-rose-500 text-[10px] font-black mt-2 uppercase tracking-tighter">⚠️ คุณใช้เงินเกินงบที่ตั้งไว้แล้ว!</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
             <div className="flex items-center gap-4 mb-4">
                <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl">
                  <BrainCircuit size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">AI ที่ปรึกษา</h2>
                  <p className="text-slate-500 font-bold">วิเคราะห์วินัยทางการเงินของคุณ</p>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-4">
               {aiInsights.length > 0 ? (
                 aiInsights.map((insight, i) => (
                   <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 150}ms` }}>
                     <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black mb-3 border ${insight.priority === 'high' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'}`}>
                       {insight.priority === 'high' ? 'แนะนำด่วน' : 'เกร็ดความรู้'}
                     </div>
                     <h3 className="text-xl font-black mb-3 text-slate-800">{insight.title}</h3>
                     <p className="text-slate-500 text-sm leading-relaxed font-medium">{insight.recommendation}</p>
                   </div>
                 ))
               ) : (
                 <div className="p-24 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-300 font-black italic">
                   {isAiLoading ? "กำลังวิเคราะห์ข้อมูล..." : "ยังไม่มีข้อมูลวิเคราะห์ คลิกปุ่มด้านล่างเพื่อเริ่ม"}
                 </div>
               )}
             </div>

             <button 
                onClick={handleFetchAI} 
                disabled={isAiLoading}
                className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black flex items-center justify-center gap-3 shadow-2xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isAiLoading ? <RefreshCw className="animate-spin" /> : <BrainCircuit />} 
                {isAiLoading ? 'น้อง AI กำลังคำนวณ...' : 'วิเคราะห์พฤติกรรมการเงิน'}
              </button>
          </div>
        )}
      </main>

      {/* Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">จดบันทึก</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-8 space-y-6">
               <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  <button type="button" onClick={() => {setFormType('expense'); setFormCategory(CATEGORIES.expense[0]);}} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${formType === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}>จ่ายเงิน</button>
                  <button type="button" onClick={() => {setFormType('income'); setFormCategory(CATEGORIES.income[0]);}} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${formType === 'income' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>ได้รับเงิน</button>
               </div>
               
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">จำนวนเงิน (บาท)</label>
                 <input 
                   type="number" 
                   required 
                   placeholder="0.00" 
                   autoFocus
                   value={formAmount} 
                   onChange={(e) => setFormAmount(e.target.value)} 
                   className="w-full bg-slate-50 border-4 border-slate-50 rounded-[2rem] py-6 px-8 text-4xl font-black focus:border-indigo-50 outline-none transition-all placeholder:text-slate-200" 
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">หมวดหมู่</label>
                   <select 
                    value={formCategory} 
                    onChange={(e) => setFormCategory(e.target.value)} 
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-4 font-black text-xs outline-none focus:border-indigo-100 appearance-none"
                   >
                     {CATEGORIES[formType].map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">วันที่</label>
                   <input 
                    type="date" 
                    value={formDate} 
                    onChange={(e) => setFormDate(e.target.value)} 
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-4 font-black text-xs outline-none focus:border-indigo-100" 
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">บันทึกเพิ่มเติม</label>
                 <input 
                  type="text" 
                  placeholder="เช่น มื้อเที่ยงคณะ, เงินเดือน..." 
                  value={formDesc} 
                  onChange={(e) => setFormDesc(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 font-bold text-sm outline-none focus:border-indigo-100" 
                 />
               </div>

               <button 
                type="submit" 
                className={`w-full py-5 rounded-[2rem] font-black text-white shadow-2xl transition-all active:scale-95 mt-4 text-lg ${formType === 'income' ? 'bg-emerald-500 shadow-emerald-100' : 'bg-rose-500 shadow-rose-100'}`}
               >
                บันทึก {formType === 'income' ? 'รายรับ' : 'รายจ่าย'}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 flex justify-around p-4 z-30 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
        <MobileNavItem icon={<PieIcon />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<List />} active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-indigo-600 text-white p-4 rounded-full -mt-12 shadow-2xl ring-8 ring-slate-50 active:scale-90 transition-transform"
        >
          <Plus size={28} />
        </button>
        <MobileNavItem icon={<Calendar />} active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} />
        <MobileNavItem icon={<BrainCircuit />} active={activeTab === 'ai'} onClick={handleFetchAI} />
      </nav>
    </div>
  );
};

// Sub-components
const NavItem = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const MobileNavItem = ({ icon, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`p-4 rounded-2xl transition-all ${active ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
  </button>
);

const SummaryCard = ({ title, amount, icon, isPercent, color }: any) => {
  const colorMap: any = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  };
  
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-lg group">
      <div className="flex justify-between items-center mb-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black text-slate-800">
        {isPercent ? `${amount.toFixed(1)}%` : `฿${amount.toLocaleString()}`}
      </p>
    </div>
  );
};

const TransactionItem = ({ transaction, onDelete }: any) => (
  <div className="group flex items-center justify-between p-5 hover:bg-slate-50 transition-all rounded-3xl">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${transaction.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
        {transaction.type === 'income' ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
      </div>
      <div>
        <p className="font-black text-slate-800 text-sm leading-none mb-2">{transaction.description}</p>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-wider">
          <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-slate-500">{transaction.category}</span>
          <span>•</span>
          <span>{new Date(transaction.date).toLocaleDateString('th-TH')}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <p className={`font-black text-lg ${transaction.type === 'income' ? 'text-emerald-500' : 'text-slate-800'}`}>
        {transaction.type === 'income' ? '+' : '-'}฿{Number(transaction.amount).toLocaleString()}
      </p>
      <button 
        onClick={() => onDelete(transaction.id)} 
        className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
      >
        <Trash2 size={18} />
      </button>
    </div>
  </div>
);

export default App;
