
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, 
  PieChart as PieIcon, List, BrainCircuit,
  X, Trash2, Calendar, GraduationCap
} from 'lucide-react';
import { Transaction, Budget, TransactionType, AIInsight } from './types';
import { CATEGORIES, CATEGORY_COLORS } from './constants';
import { getFinancialInsights } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('budgets');
    // Default budgets tailored for students
    return saved ? JSON.parse(saved) : CATEGORIES.expense.map(c => ({ category: c, limit: 3000 }));
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'ai'>('dashboard');
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New Transaction Form State
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES.expense[0]);
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Persist Data
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }, [budgets]);

  // Calculations
  const summary = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0
    };
  }, [transactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
    return Object.keys(data).map(name => ({ name, value: data[name] }));
  }, [transactions]);

  const budgetProgressData = useMemo(() => {
    return budgets.map(b => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category === b.category)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        category: b.category,
        spent,
        limit: b.limit,
        percentage: Math.min((spent / b.limit) * 100, 100)
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [transactions, budgets]);

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
    resetForm();
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const resetForm = () => {
    setFormAmount('');
    setFormDesc('');
    setFormDate(new Date().toISOString().split('T')[0]);
  };

  const updateBudget = (category: string, limit: number) => {
    setBudgets(budgets.map(b => b.category === category ? { ...b, limit } : b));
  };

  const fetchAIInsights = async () => {
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

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64 bg-slate-50 text-slate-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-6 z-20">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-lg">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">WealthWisely <span className="text-indigo-600 text-[10px] block uppercase -mt-1">Student Ed.</span></h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavItem icon={<PieIcon size={20}/>} label="สรุปภาพรวม" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<List size={20}/>} label="ประวัติการใช้จ่าย" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
          <NavItem icon={<Calendar size={20}/>} label="งบประมาณรายเดือน" active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} />
          <NavItem icon={<BrainCircuit size={20}/>} label="AI ช่วยวางแผน" active={activeTab === 'ai'} onClick={fetchAIInsights} />
        </nav>

        <div className="mt-auto">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">เงินเหลือในกระเป๋า</p>
            <p className="text-2xl font-black text-slate-800">฿{summary.balance.toLocaleString()}</p>
          </div>
        </div>
      </aside>

      {/* Bottom Nav - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-30 shadow-2xl">
        <MobileNavItem icon={<PieIcon size={24}/>} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<List size={24}/>} active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white p-3 rounded-full -mt-8 shadow-lg ring-4 ring-white active:scale-95 transition-transform">
          <Plus size={28} />
        </button>
        <MobileNavItem icon={<Calendar size={24}/>} active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} />
        <MobileNavItem icon={<BrainCircuit size={24}/>} active={activeTab === 'ai'} onClick={fetchAIInsights} />
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-8 lg:hidden">
           <div className="flex items-center gap-2">
             <GraduationCap className="text-indigo-600" size={24} />
             <h1 className="text-xl font-bold tracking-tight">WealthWisely Student</h1>
           </div>
           <div className="bg-indigo-50 px-3 py-1 rounded-full text-indigo-700 text-sm font-bold border border-indigo-100">
             ฿{summary.balance.toLocaleString()}
           </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard 
                title="รายรับ (ค่าขนม/งาน)" 
                amount={summary.income} 
                icon={<TrendingUp className="text-emerald-500" />} 
                color="bg-white border-emerald-100"
              />
              <SummaryCard 
                title="รายจ่ายทั้งหมด" 
                amount={summary.expenses} 
                icon={<TrendingDown className="text-rose-500" />} 
                color="bg-white border-rose-100"
              />
              <SummaryCard 
                title="เก็บได้แล้ว" 
                amount={summary.savingsRate} 
                isPercent={true}
                icon={<Wallet className="text-indigo-500" />} 
                color="bg-white border-indigo-100"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="หมวดหมู่ที่ใช้บ่อย">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="คุมงบแต่ละหมวด">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetProgressData.slice(0, 5)} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="category" type="category" width={100} tick={{fontSize: 12}} />
                      <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="spent" name="ใช้ไป" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card title="รายการล่าสุด" action={<button onClick={() => setActiveTab('transactions')} className="text-indigo-600 text-sm font-bold hover:underline">ดูประวัติทั้งหมด</button>}>
              <div className="divide-y divide-slate-100">
                {transactions.slice(0, 5).map(t => (
                  <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />
                ))}
                {transactions.length === 0 && <p className="text-slate-400 text-center py-10 italic">ยังไม่มีบันทึก... ลองจดค่าขนมวันนี้ดูไหม?</p>}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800">ประวัติการใช้เงิน</h2>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                <Plus size={20} /> จดรายการใหม่
              </button>
            </div>
            <Card>
              <div className="divide-y divide-slate-100">
                {transactions.map(t => (
                  <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />
                ))}
                {transactions.length === 0 && <p className="text-slate-400 text-center py-12">ไม่มีรายการธุรกรรมในขณะนี้</p>}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800">วางแผนงบรายเดือน</h2>
            <p className="text-slate-500 -mt-4">กำหนดเป้าหมายการใช้เงินในแต่ละหมวดเพื่อไม่ให้กระเป๋าแห้งก่อนสิ้นเดือน</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgetProgressData.map(b => (
                <Card key={b.category}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{b.category}</h3>
                      <p className="text-slate-400 text-xs font-medium">ใช้แล้ว: ฿{b.spent.toLocaleString()} / ฿{b.limit.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <label className="block text-[10px] uppercase font-bold text-indigo-400 mb-1">งบที่ตั้งไว้</label>
                      <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                        <span className="text-slate-400 text-xs mr-1">฿</span>
                        <input 
                          type="number" 
                          value={b.limit} 
                          onChange={(e) => updateBudget(b.category, Number(e.target.value))}
                          className="w-20 bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${b.percentage >= 100 ? 'bg-rose-500' : b.percentage >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                      style={{ width: `${b.percentage}%` }}
                    />
                  </div>
                  {b.percentage >= 100 ? (
                    <p className="text-[11px] text-rose-500 mt-2 font-bold flex items-center gap-1">
                      <TrendingDown size={12} /> ใช้เกินงบแล้วนะ!
                    </p>
                  ) : b.percentage >= 80 ? (
                    <p className="text-[11px] text-amber-500 mt-2 font-bold">ใกล้จะเต็มงบแล้ว ระวังด้วย!</p>
                  ) : (
                    <p className="text-[11px] text-emerald-500 mt-2 font-bold">ยังคุมงบได้ดีอยู่</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
               <div className="bg-indigo-600 p-4 rounded-3xl shadow-xl shadow-indigo-100">
                 <BrainCircuit className="text-white" size={32} />
               </div>
               <div>
                 <h2 className="text-2xl font-black text-slate-800">ที่ปรึกษาการเงิน AI สำหรับนักศึกษา</h2>
                 <p className="text-slate-500">วิเคราะห์นิสัยการใช้เงินเพื่อการออมที่ดีขึ้น</p>
               </div>
            </div>

            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-indigo-600 font-bold animate-pulse">น้อง AI กำลังวิเคราะห์กระเป๋าตังค์ของคุณ...</p>
                <p className="text-slate-400 text-sm mt-2">รอนิดนึงนะ กำลังหาเทคนิคประหยัดเงินให้อยู่</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {aiInsights.length > 0 ? aiInsights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} />
                )) : (
                  <div className="col-span-3 text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-indigo-100">
                    <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                       <BrainCircuit className="text-indigo-400" />
                    </div>
                    <p className="text-slate-500 font-medium">กดปุ่มด้านล่างเพื่อให้น้อง AI ช่วยวิเคราะห์การใช้เงินของคุณ</p>
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={fetchAIInsights}
              disabled={isAiLoading}
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              <BrainCircuit size={24} />
              {aiInsights.length > 0 ? 'อัปเดตการวิเคราะห์ใหม่' : 'ให้น้อง AI ช่วยแนะนำ'}
            </button>
          </div>
        )}
      </main>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <h3 className="text-2xl font-black text-slate-800">จดรายการใหม่</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-8 space-y-6">
              <div className="flex p-1.5 bg-slate-100 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => { setFormType('expense'); setFormCategory(CATEGORIES.expense[0]); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${formType === 'expense' ? 'bg-white text-rose-500 shadow-md' : 'text-slate-500'}`}
                >
                  จ่ายเงิน
                </button>
                <button 
                  type="button"
                  onClick={() => { setFormType('income'); setFormCategory(CATEGORIES.income[0]); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${formType === 'income' ? 'bg-white text-emerald-500 shadow-md' : 'text-slate-500'}`}
                >
                  ได้เงินมา
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">เท่าไหร่ (บาท)</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-3xl font-black group-focus-within:text-indigo-400 transition-colors">฿</span>
                  <input 
                    type="number" 
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] py-5 pl-14 pr-6 text-4xl font-black focus:border-indigo-400 focus:bg-white outline-none transition-all placeholder:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">หมวดหมู่</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-4 focus:border-indigo-400 focus:bg-white outline-none text-sm font-bold text-slate-700 transition-all appearance-none"
                  >
                    {CATEGORIES[formType].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">วันที่</label>
                  <input 
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-4 focus:border-indigo-400 focus:bg-white outline-none text-sm font-bold text-slate-700 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">จดสั้นๆ กันลืม</label>
                <input 
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="เช่น มื้อเที่ยงกับเพื่อน, ค่าชีทเรียน..."
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 focus:border-indigo-400 focus:bg-white outline-none text-sm font-bold text-slate-700 transition-all"
                />
              </div>

              <button 
                type="submit"
                className={`w-full py-5 rounded-[1.5rem] font-black text-lg transition-all shadow-xl active:scale-[0.98] text-white ${formType === 'income' ? 'bg-emerald-500 shadow-emerald-100 hover:bg-emerald-600' : 'bg-rose-500 shadow-rose-100 hover:bg-rose-600'}`}
              >
                บันทึกรายการ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const NavItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-3.5 rounded-2xl transition-all ${active ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}
  >
    {icon}
  </button>
);

const Card: React.FC<{ title?: string, action?: React.ReactNode, children: React.ReactNode }> = ({ title, action, children }) => (
  <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm overflow-hidden h-full">
    {(title || action) && (
      <div className="flex justify-between items-center mb-6">
        {title && <h3 className="text-lg font-black text-slate-800">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

const SummaryCard: React.FC<{ title: string, amount: number, icon: React.ReactNode, color: string, isPercent?: boolean }> = ({ title, amount, icon, color, isPercent }) => (
  <div className={`p-6 rounded-[2rem] border-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 ${color}`}>
    <div className="flex justify-between items-start mb-4">
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <div className="bg-white/80 p-2 rounded-xl border border-slate-50">
        {icon}
      </div>
    </div>
    <p className="text-3xl font-black text-slate-900 leading-none">
      {isPercent ? `${amount.toFixed(1)}%` : `฿${amount.toLocaleString()}`}
    </p>
  </div>
);

const TransactionItem: React.FC<{ transaction: Transaction, onDelete: (id: string) => void }> = ({ transaction, onDelete }) => (
  <div className="group flex items-center justify-between py-4 hover:bg-indigo-50/30 transition-all px-3 -mx-3 rounded-2xl">
    <div className="flex items-center gap-4">
      <div className={`p-3.5 rounded-2xl border ${transaction.type === 'income' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
        {transaction.type === 'income' ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
      </div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm md:text-base">{transaction.description}</h4>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-wider">
          <span className="bg-slate-100 px-1.5 py-0.5 rounded-md">{transaction.category}</span>
          <span>•</span>
          <span>{new Date(transaction.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <p className={`font-black text-base md:text-lg ${transaction.type === 'income' ? 'text-emerald-500' : 'text-slate-800'}`}>
        {transaction.type === 'income' ? '+' : '-'}฿{transaction.amount.toLocaleString()}
      </p>
      <button 
        onClick={() => onDelete(transaction.id)}
        className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-rose-50 rounded-lg"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>
);

const InsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => {
  const priorityLabel = insight.priority === 'high' ? 'แนะนำด่วน' : insight.priority === 'medium' ? 'ควรทราบ' : 'เกร็ดความรู้';
  const priorityColor = insight.priority === 'high' ? 'text-rose-600 bg-rose-50 border-rose-100' : insight.priority === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100';
  
  return (
    <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden flex flex-col h-full hover:shadow-xl transition-all group">
      <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80"></div>
      <div className={`self-start px-3 py-1 rounded-full text-[10px] font-black uppercase mb-5 border ${priorityColor}`}>
        {priorityLabel}
      </div>
      <h3 className="font-black text-xl mb-3 text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{insight.title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">{insight.recommendation}</p>
      <div className="mt-auto pt-4 border-t border-slate-50">
        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors">ศึกษาเทคนิคออมเงินเพิ่ม</span>
      </div>
    </div>
  );
};

export default App;
