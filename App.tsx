
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip
} from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, 
  PieChart as PieIcon, List, BrainCircuit,
  X, Trash2, Calendar, GraduationCap, RefreshCw,
  Sun, Moon, Languages
} from 'lucide-react';
import { Transaction, Budget, TransactionType, AIInsight, Language, Theme } from './types';
import { CATEGORIES, CATEGORY_COLORS, TRANSLATIONS } from './constants';
import { getFinancialInsights } from './services/geminiService';

const App: React.FC = () => {
  // Config State
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('ww_lang') as Language) || 'th');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('ww_theme') as Theme) || 'dark');
  
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
  const [formCategory, setFormCategory] = useState(CATEGORIES[lang].expense[0]);
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const t = TRANSLATIONS[lang];

  // Persist Settings
  useEffect(() => { localStorage.setItem('ww_lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('ww_theme', theme); }, [theme]);

  // Update form category when language changes
  useEffect(() => {
    setFormCategory(CATEGORIES[lang][formType][0]);
  }, [lang, formType]);

  // Load Financial Data
  useEffect(() => {
    const localTrans = localStorage.getItem('ww_transactions');
    const localBudgets = localStorage.getItem('ww_budgets');
    
    if (localTrans) setTransactions(JSON.parse(localTrans));
    if (localBudgets) {
      setBudgets(JSON.parse(localBudgets));
    } else {
      const defaultBudgets = CATEGORIES[lang].expense.map(c => ({ category: c, amount_limit: 3000 }));
      setBudgets(defaultBudgets);
      localStorage.setItem('ww_budgets', JSON.stringify(defaultBudgets));
    }
    setIsDataLoading(false);
  }, []);

  // Persist Data
  useEffect(() => {
    if (!isDataLoading) localStorage.setItem('ww_transactions', JSON.stringify(transactions));
  }, [transactions, isDataLoading]);

  useEffect(() => {
    if (!isDataLoading) localStorage.setItem('ww_budgets', JSON.stringify(budgets));
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

  const deleteTransaction = (id: string) => setTransactions(transactions.filter(t => t.id !== id));
  const updateBudget = (category: string, amount_limit: number) => setBudgets(budgets.map(b => b.category === category ? { ...b, amount_limit } : b));

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
    transactions.filter(t => t.type === 'expense').forEach(tr => {
      data[tr.category] = (data[tr.category] || 0) + Number(tr.amount);
    });
    return Object.keys(data).map(name => ({ name, value: data[name] }));
  }, [transactions]);

  const budgetProgressData = useMemo(() => {
    return budgets.map(b => {
      const spent = transactions.filter(tr => tr.type === 'expense' && tr.category === b.category).reduce((sum, tr) => sum + Number(tr.amount), 0);
      return { 
        category: b.category, 
        spent, 
        amount_limit: b.amount_limit, 
        percentage: Math.min((spent / b.amount_limit) * 100, 100) 
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [transactions, budgets]);

  // Color Constants
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const sidebarColor = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const cardColor = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';

  if (isDataLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${bgColor}`}>
        <GraduationCap className="text-indigo-500 animate-bounce mb-4" size={64} />
        <p className="text-indigo-400 font-bold animate-pulse">WealthWisely...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-64 ${bgColor} ${textColor} selection:bg-indigo-500 selection:text-white transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 ${sidebarColor} border-r p-8 z-20`}>
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
            <GraduationCap size={28} />
          </div>
          <h1 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>WealthWisely</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavItem icon={<PieIcon size={20}/>} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isDark={isDark} />
          <NavItem icon={<List size={20}/>} label={t.history} active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} isDark={isDark} />
          <NavItem icon={<Calendar size={20}/>} label={t.budgets} active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} isDark={isDark} />
          <NavItem icon={<BrainCircuit size={20}/>} label={t.aiAdvice} active={activeTab === 'ai'} onClick={handleFetchAI} isDark={isDark} />
        </nav>

        {/* Settings Buttons */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`flex-1 p-3 rounded-2xl flex items-center justify-center transition-all ${isDark ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setLang(lang === 'th' ? 'en' : 'th')} className={`flex-1 p-3 rounded-2xl flex items-center justify-center font-black text-xs transition-all ${isDark ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700' : 'bg-slate-100 text-indigo-600 hover:bg-slate-200'}`}>
            <Languages size={20} className="mr-2" /> {lang.toUpperCase()}
          </button>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[2rem] text-white shadow-2xl shadow-indigo-500/10">
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">{t.balance}</p>
          <p className="text-2xl font-black">฿{summary.balance.toLocaleString()}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 md:p-12">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <header className="flex justify-between items-start">
              <div>
                <h2 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.greet}</h2>
                <p className={`${subTextColor} font-medium`}>{t.subGreet}</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard title={t.income} amount={summary.income} icon={<TrendingUp className="text-emerald-400" />} color="emerald" isDark={isDark} />
              <SummaryCard title={t.expenses} amount={summary.expenses} icon={<TrendingDown className="text-rose-400" />} color="rose" isDark={isDark} />
              <SummaryCard title={t.savingsRate} amount={summary.savingsRate} isPercent={true} icon={<Wallet className="text-indigo-400" />} color="indigo" isDark={isDark} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${cardColor} p-8 rounded-[2.5rem]`}>
                <h3 className={`text-lg font-black mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.proportion}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                        {categoryData.map((e, i) => <Cell key={i} fill={CATEGORY_COLORS[e.name] || '#475569'} stroke="none" />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRadius: '16px', border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', color: isDark ? '#f8fafc' : '#1e293b' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={`${cardColor} p-8 rounded-[2.5rem] overflow-hidden`}>
                <h3 className={`text-lg font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.recent}</h3>
                <div className="space-y-1">
                  {transactions.slice(0, 5).map(tr => <TransactionItem key={tr.id} transaction={tr} onDelete={deleteTransaction} isDark={isDark} />)}
                  {transactions.length === 0 && <p className={`text-center py-12 ${isDark ? 'text-slate-600' : 'text-slate-300'} font-bold italic`}>{t.noRec}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.history}</h2>
              <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                {t.addBtn}
              </button>
            </div>
            <div className={`${cardColor} rounded-[2.5rem] divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'} overflow-hidden`}>
              {transactions.length > 0 ? (
                transactions.map(tr => <TransactionItem key={tr.id} transaction={tr} onDelete={deleteTransaction} isDark={isDark} />)
              ) : (
                <div className={`p-24 text-center ${isDark ? 'text-slate-600' : 'text-slate-300'} font-black italic`}>{t.empty}</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="space-y-6">
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.setBudget}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgetProgressData.map(b => (
                <div key={b.category} className={`${cardColor} p-8 rounded-[2.5rem] transition-all hover:border-indigo-500/30`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <h4 className={`font-black ${isDark ? 'text-slate-200' : 'text-slate-800'} text-lg leading-tight`}>{b.category}</h4>
                      <p className={`text-xs ${subTextColor} font-bold mt-1`}>
                        {t.used} ฿{b.spent.toLocaleString()} / ฿{b.amount_limit.toLocaleString()}
                      </p>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        className={`w-24 ${isDark ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-900 border-slate-50'} border-2 focus:border-indigo-500/50 rounded-xl p-2 text-sm font-black text-center outline-none transition-all`} 
                        value={b.amount_limit} 
                        onChange={(e) => updateBudget(b.category, Number(e.target.value))} 
                      />
                    </div>
                  </div>
                  <div className={`w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'} h-3 rounded-full overflow-hidden`}>
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${b.percentage > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${b.percentage}%` }} 
                    />
                  </div>
                  {b.percentage >= 100 && <p className="text-rose-400 text-[10px] font-black mt-2 uppercase tracking-tighter">{t.overBudget}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
             <div className="flex items-center gap-4 mb-4">
                <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                  <BrainCircuit size={32} />
                </div>
                <div>
                  <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.aiConsult}</h2>
                  <p className={`${subTextColor} font-bold`}>{t.aiDesc}</p>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-4">
               {aiInsights.length > 0 ? (
                 aiInsights.map((insight, i) => (
                   <div key={i} className={`${cardColor} p-8 rounded-[2.5rem] animate-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${i * 150}ms` }}>
                     <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black mb-3 border ${insight.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                       {insight.priority === 'high' ? t.urgent : t.tip}
                     </div>
                     <h3 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>{insight.title}</h3>
                     <p className={`${subTextColor} text-sm leading-relaxed font-medium`}>{insight.recommendation}</p>
                   </div>
                 ))
               ) : (
                 <div className={`${cardColor} p-24 text-center border-2 border-dashed ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-100 text-slate-300'} font-black italic rounded-[2.5rem]`}>
                   {isAiLoading ? t.analyzing : t.noAi}
                 </div>
               )}
             </div>

             <button 
                onClick={handleFetchAI} 
                disabled={isAiLoading}
                className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black flex items-center justify-center gap-3 shadow-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isAiLoading ? <RefreshCw className="animate-spin" /> : <BrainCircuit />} 
                {isAiLoading ? t.analyzing : t.analyzeBtn}
              </button>
          </div>
        )}
      </main>

      {/* Entry Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? 'bg-slate-950/80' : 'bg-slate-900/60'} backdrop-blur-md animate-in fade-in duration-300`}>
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'} w-full max-w-md rounded-[3rem] shadow-2xl border overflow-hidden animate-in zoom-in duration-300`}>
            <div className={`p-8 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'} flex justify-between items-center`}>
              <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.record}</h3>
              <button onClick={() => setIsModalOpen(false)} className={`p-3 rounded-2xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-50 text-slate-400'}`}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-8 space-y-6">
               <div className={`flex ${isDark ? 'bg-slate-800' : 'bg-slate-100'} p-1.5 rounded-2xl`}>
                  <button type="button" onClick={() => {setFormType('expense');}} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${formType === 'expense' ? (isDark ? 'bg-slate-700 text-rose-400' : 'bg-white text-rose-500 shadow-sm') : 'text-slate-500'}`}>{t.pay}</button>
                  <button type="button" onClick={() => {setFormType('income');}} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${formType === 'income' ? (isDark ? 'bg-slate-700 text-emerald-400' : 'bg-white text-emerald-500 shadow-sm') : 'text-slate-500'}`}>{t.receive}</button>
               </div>
               
               <div className="space-y-2">
                 <label className={`text-[10px] font-black ${subTextColor} uppercase tracking-widest px-2`}>{t.amt}</label>
                 <input 
                   type="number" 
                   required 
                   placeholder="0.00" 
                   autoFocus
                   value={formAmount} 
                   onChange={(e) => setFormAmount(e.target.value)} 
                   className={`w-full ${isDark ? 'bg-slate-800 border-slate-800 focus:border-indigo-500/30' : 'bg-slate-50 border-slate-50 focus:border-indigo-500/10'} border-4 rounded-[2rem] py-6 px-8 text-4xl font-black outline-none transition-all placeholder:text-slate-700`} 
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className={`text-[10px] font-black ${subTextColor} uppercase tracking-widest px-2`}>{t.cat}</label>
                   <select 
                    value={formCategory} 
                    onChange={(e) => setFormCategory(e.target.value)} 
                    className={`w-full ${isDark ? 'bg-slate-800 border-slate-800 focus:border-indigo-500/30' : 'bg-slate-50 border-slate-50 focus:border-indigo-500/10'} border-2 rounded-2xl py-4 px-4 font-black text-xs outline-none appearance-none`}
                   >
                     {CATEGORIES[lang][formType].map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className={`text-[10px] font-black ${subTextColor} uppercase tracking-widest px-2`}>{t.date}</label>
                   <input 
                    type="date" 
                    value={formDate} 
                    onChange={(e) => setFormDate(e.target.value)} 
                    className={`w-full ${isDark ? 'bg-slate-800 border-slate-800 focus:border-indigo-500/30' : 'bg-slate-50 border-slate-50 focus:border-indigo-500/10'} border-2 rounded-2xl py-4 px-4 font-black text-xs outline-none`} 
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className={`text-[10px] font-black ${subTextColor} uppercase tracking-widest px-2`}>{t.note}</label>
                 <input 
                  type="text" 
                  placeholder="..." 
                  value={formDesc} 
                  onChange={(e) => setFormDesc(e.target.value)} 
                  className={`w-full ${isDark ? 'bg-slate-800 border-slate-800 focus:border-indigo-500/30' : 'bg-slate-50 border-slate-50 focus:border-indigo-500/10'} border-2 rounded-2xl py-4 px-6 font-bold text-sm outline-none`} 
                 />
               </div>

               <button 
                type="submit" 
                className={`w-full py-5 rounded-[2rem] font-black text-white shadow-2xl transition-all active:scale-95 mt-4 text-lg ${formType === 'income' ? 'bg-emerald-600 shadow-emerald-500/10' : 'bg-rose-600 shadow-rose-500/10'}`}
               >
                {t.save} {formType === 'income' ? t.receive : t.pay}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 ${isDark ? 'bg-slate-900/90' : 'bg-white/90'} backdrop-blur-lg border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} flex justify-around p-4 z-30`}>
        <MobileNavItem icon={<PieIcon />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isDark={isDark} />
        <MobileNavItem icon={<List />} active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} isDark={isDark} />
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-indigo-600 text-white p-4 rounded-full -mt-12 shadow-2xl ring-8 ring-slate-950 active:scale-90 transition-transform"
        >
          <Plus size={28} />
        </button>
        <MobileNavItem icon={<Calendar />} active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} isDark={isDark} />
        <MobileNavItem icon={<BrainCircuit />} active={activeTab === 'ai'} onClick={handleFetchAI} isDark={isDark} />
      </nav>

      {/* Mobile Config Bar */}
      <div className="lg:hidden fixed top-4 right-4 z-40 flex flex-col gap-2">
        <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`p-3 rounded-full shadow-lg backdrop-blur-md ${isDark ? 'bg-slate-800/80 text-amber-400' : 'bg-white/80 text-slate-600 border border-slate-200'}`}>
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button onClick={() => setLang(lang === 'th' ? 'en' : 'th')} className={`p-3 rounded-full shadow-lg backdrop-blur-md font-black text-[10px] ${isDark ? 'bg-slate-800/80 text-indigo-400' : 'bg-white/80 text-indigo-600 border border-slate-200'}`}>
          {lang.toUpperCase()}
        </button>
      </div>
    </div>
  );
};

// Sub-components
const NavItem = ({ icon, label, active, onClick, isDark }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : (isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-50')}`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const MobileNavItem = ({ icon, active, onClick, isDark }: any) => (
  <button 
    onClick={onClick} 
    className={`p-4 rounded-2xl transition-all ${active ? 'text-indigo-400 bg-indigo-500/10' : (isDark ? 'text-slate-600' : 'text-slate-300')}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
  </button>
);

const SummaryCard = ({ title, amount, icon, isPercent, color, isDark }: any) => {
  const colorMap: any = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
  };
  
  return (
    <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all group ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-indigo-100 shadow-slate-200/50'}`}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
        <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {isPercent ? `${amount.toFixed(1)}%` : `฿${amount.toLocaleString()}`}
      </p>
    </div>
  );
};

const TransactionItem = ({ transaction, onDelete, isDark }: any) => (
  <div className={`group flex items-center justify-between p-5 transition-all rounded-3xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${transaction.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
        {transaction.type === 'income' ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
      </div>
      <div>
        <p className={`font-black text-sm leading-none mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{transaction.description}</p>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-wider">
          <span className={`${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} px-2 py-0.5 rounded-lg`}>{transaction.category}</span>
          <span>•</span>
          <span>{new Date(transaction.date).toLocaleDateString('th-TH')}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <p className={`font-black text-lg ${transaction.type === 'income' ? 'text-emerald-400' : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
        {transaction.type === 'income' ? '+' : '-'}฿{Number(transaction.amount).toLocaleString()}
      </p>
      <button 
        onClick={() => onDelete(transaction.id)} 
        className={`${isDark ? 'text-slate-700' : 'text-slate-200'} hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2`}
      >
        <Trash2 size={18} />
      </button>
    </div>
  </div>
);

export default App;
