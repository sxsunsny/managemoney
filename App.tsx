
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, 
  PieChart as PieIcon, List, BrainCircuit,
  X, Trash2, Calendar
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
    return saved ? JSON.parse(saved) : CATEGORIES.expense.map(c => ({ category: c, limit: 500 }));
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
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Wallet className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">WealthWisely</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavItem icon={<PieIcon size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<List size={20}/>} label="Transactions" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
          <NavItem icon={<Calendar size={20}/>} label="Budgeting" active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} />
          <NavItem icon={<BrainCircuit size={20}/>} label="AI Insights" active={activeTab === 'ai'} onClick={fetchAIInsights} />
        </nav>

        <div className="mt-auto">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-slate-800">${summary.balance.toLocaleString()}</p>
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
           <h1 className="text-2xl font-bold tracking-tight">WealthWisely</h1>
           <div className="bg-indigo-50 px-3 py-1 rounded-full text-indigo-700 text-sm font-semibold">
             ${summary.balance.toLocaleString()}
           </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard 
                title="Total Income" 
                amount={summary.income} 
                icon={<TrendingUp className="text-emerald-500" />} 
                color="bg-emerald-50"
              />
              <SummaryCard 
                title="Total Expenses" 
                amount={summary.expenses} 
                icon={<TrendingDown className="text-rose-500" />} 
                color="bg-rose-50"
              />
              <SummaryCard 
                title="Savings Rate" 
                amount={summary.savingsRate} 
                isPercent={true}
                icon={<Wallet className="text-indigo-500" />} 
                color="bg-indigo-50"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Expense Distribution">
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
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Budget vs Actual">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetProgressData.slice(0, 5)}>
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="spent" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="limit" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card title="Recent Transactions" action={<button onClick={() => setActiveTab('transactions')} className="text-indigo-600 text-sm font-medium hover:underline">View All</button>}>
              <div className="divide-y divide-slate-100">
                {transactions.slice(0, 5).map(t => (
                  <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />
                ))}
                {transactions.length === 0 && <p className="text-slate-500 text-center py-8">No transactions yet. Start by adding one!</p>}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">All Transactions</h2>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus size={20} /> Add New
              </button>
            </div>
            <Card title="Transaction History">
              <div className="divide-y divide-slate-100">
                {transactions.map(t => (
                  <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />
                ))}
                {transactions.length === 0 && <p className="text-slate-500 text-center py-8">Your transaction list is empty.</p>}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold">Monthly Budgets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgetProgressData.map(b => (
                <Card key={b.category}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{b.category}</h3>
                      <p className="text-slate-500 text-sm">Spent: ${b.spent.toLocaleString()} / ${b.limit.toLocaleString()}</p>
                    </div>
                    <input 
                      type="number" 
                      value={b.limit} 
                      onChange={(e) => updateBudget(b.category, Number(e.target.value))}
                      className="w-24 bg-slate-100 border-none rounded-md px-2 py-1 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${b.percentage >= 100 ? 'bg-rose-500' : b.percentage >= 80 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${b.percentage}%` }}
                    />
                  </div>
                  {b.percentage >= 100 && <p className="text-xs text-rose-500 mt-2 font-medium">Budget exceeded!</p>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
               <div className="bg-indigo-100 p-3 rounded-2xl">
                 <BrainCircuit className="text-indigo-600" size={32} />
               </div>
               <div>
                 <h2 className="text-2xl font-bold">Wealth Intelligence</h2>
                 <p className="text-slate-500">AI-powered insights based on your financial patterns.</p>
               </div>
            </div>

            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-indigo-600 font-medium">Analyzing your financial DNA...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {aiInsights.length > 0 ? aiInsights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} />
                )) : (
                  <div className="col-span-3 text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
                    <p className="text-slate-400">Click the AI Insights tab to generate custom recommendations.</p>
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={fetchAIInsights}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <BrainCircuit size={20} />
              Refresh Insights
            </button>
          </div>
        )}
      </main>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold">New Transaction</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-6 space-y-5">
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button 
                  type="button"
                  onClick={() => { setFormType('expense'); setFormCategory(CATEGORIES.expense[0]); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formType === 'expense' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Expense
                </button>
                <button 
                  type="button"
                  onClick={() => { setFormType('income'); setFormCategory(CATEGORIES.income[0]); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Income
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-medium">$</span>
                  <input 
                    type="number" 
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-10 pr-4 text-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                  >
                    {CATEGORIES[formType].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                  <input 
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <input 
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What was this for?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98]"
              >
                Add {formType === 'income' ? 'Income' : 'Expense'}
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
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-2xl transition-all ${active ? 'text-indigo-600' : 'text-slate-400'}`}
  >
    {icon}
  </button>
);

const Card: React.FC<{ title?: string, action?: React.ReactNode, children: React.ReactNode }> = ({ title, action, children }) => (
  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
    {(title || action) && (
      <div className="flex justify-between items-center mb-6">
        {title && <h3 className="text-lg font-bold text-slate-800">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

const SummaryCard: React.FC<{ title: string, amount: number, icon: React.ReactNode, color: string, isPercent?: boolean }> = ({ title, amount, icon, color, isPercent }) => (
  <div className={`p-6 rounded-3xl border border-slate-100 ${color} transition-transform hover:-translate-y-1`}>
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">{title}</p>
      <div className="bg-white p-2 rounded-xl shadow-sm">
        {icon}
      </div>
    </div>
    <p className="text-3xl font-black text-slate-900">
      {isPercent ? `${amount.toFixed(1)}%` : `$${amount.toLocaleString()}`}
    </p>
  </div>
);

const TransactionItem: React.FC<{ transaction: Transaction, onDelete: (id: string) => void }> = ({ transaction, onDelete }) => (
  <div className="group flex items-center justify-between py-4 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-xl">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
        {transaction.type === 'income' ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
      </div>
      <div>
        <h4 className="font-bold text-slate-800">{transaction.description}</h4>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span>{transaction.category}</span>
          <span>•</span>
          <span>{new Date(transaction.date).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <p className={`font-bold text-lg ${transaction.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
      </p>
      <button 
        onClick={() => onDelete(transaction.id)}
        className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={18} />
      </button>
    </div>
  </div>
);

const InsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => {
  const priorityColor = insight.priority === 'high' ? 'text-rose-600 bg-rose-50' : insight.priority === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
  
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
      <div className={`self-start px-3 py-1 rounded-full text-[10px] font-black uppercase mb-4 ${priorityColor}`}>
        {insight.priority} Priority
      </div>
      <h3 className="font-bold text-xl mb-2 text-slate-800 leading-tight">{insight.title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">{insight.recommendation}</p>
      <div className="mt-auto pt-4 border-t border-slate-50">
        <span className="text-xs text-indigo-600 font-bold uppercase cursor-pointer hover:underline">Learn more</span>
      </div>
    </div>
  );
};

export default App;
