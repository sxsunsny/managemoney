
import { GoogleGenAI } from "@google/genai";

// --- State Management ---
const state = {
    lang: localStorage.getItem('ww_lang') || 'th',
    transactions: JSON.parse(localStorage.getItem('ww_transactions') || '[]'),
    activeTab: 'dashboard',
    aiInsights: [] as any[],
    isAiLoading: false,
    formType: 'expense'
};

const CATEGORIES: any = {
    th: {
        expense: ['ค่าอาหาร', 'อุปกรณ์เรียน', 'เดินทาง', 'ที่พัก', 'สังสรรค์', 'ช้อปปิ้ง', 'อื่นๆ'],
        income: ['ค่าขนม', 'งานพิเศษ', 'ทุนการศึกษา', 'ของขวัญ', 'อื่นๆ']
    },
    en: {
        expense: ['Food', 'Study', 'Travel', 'Housing', 'Social', 'Shopping', 'Others'],
        income: ['Allowance', 'Part-time', 'Scholarship', 'Gifts', 'Others']
    }
};

const T: any = {
    th: {
        greet: "สวัสดีจ้า 👋", balance: "เงินคงเหลือ", income: "รายรับ", expense: "รายจ่าย",
        add: "บันทึกรายการ", history: "ประวัติการเงิน", ai: "AI วิเคราะห์", save: "บันทึกข้อมูล",
        amt: "จำนวนเงิน", cat: "หมวดหมู่", type: "ประเภท", analyzing: "AI กำลังคิด...",
        empty: "ยังไม่มีรายการ", dashboard: "หน้าแรก", recent: "ล่าสุด", del: "ลบ"
    },
    en: {
        greet: "Hello! 👋", balance: "Balance", income: "Income", expense: "Expense",
        add: "New Record", history: "History", ai: "AI Insights", save: "Save",
        amt: "Amount", cat: "Category", type: "Type", analyzing: "AI Thinking...",
        empty: "No records yet", dashboard: "Home", recent: "Recent", del: "Delete"
    }
};

// --- Utils ---
function save() {
    localStorage.setItem('ww_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('ww_lang', state.lang);
}

function getSummary() {
    const inc = state.transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
    const exp = state.transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
    return { inc, exp, bal: inc - exp };
}

// --- View Actions ---
(window as any).setTab = (tab: string) => {
    state.activeTab = tab;
    render();
};

(window as any).toggleLang = () => {
    state.lang = state.lang === 'th' ? 'en' : 'th';
    save();
    render();
};

(window as any).setFormType = (type: string) => {
    state.formType = type;
    const btnExp = document.getElementById('btn-exp');
    const btnInc = document.getElementById('btn-inc');
    if (type === 'expense') {
        btnExp?.classList.add('bg-indigo-600', 'text-white');
        btnExp?.classList.remove('opacity-40');
        btnInc?.classList.add('opacity-40');
        btnInc?.classList.remove('bg-indigo-600', 'text-white');
    } else {
        btnInc?.classList.add('bg-indigo-600', 'text-white');
        btnInc?.classList.remove('opacity-40');
        btnExp?.classList.add('opacity-40');
        btnExp?.classList.remove('bg-indigo-600', 'text-white');
    }
    // Update category list
    const catSelect = document.getElementById('form-cat');
    if (catSelect) {
        catSelect.innerHTML = CATEGORIES[state.lang][type].map((c: string) => `<option value="${c}">${c}</option>`).join('');
    }
};

(window as any).openModal = () => {
    document.getElementById('modal')?.classList.remove('hidden');
    (window as any).setFormType('expense');
};

(window as any).closeModal = () => {
    document.getElementById('modal')?.classList.add('hidden');
};

(window as any).addTransaction = () => {
    const amtInput = document.getElementById('form-amt') as HTMLInputElement;
    const catSelect = document.getElementById('form-cat') as HTMLSelectElement;
    const amt = parseFloat(amtInput?.value || '0');
    if (!amt) return alert('กรุณาระบุจำนวนเงิน');

    const tr = {
        id: Date.now().toString(),
        type: state.formType,
        amount: amt,
        category: catSelect.value,
        date: new Date().toISOString()
    };

    state.transactions = [tr, ...state.transactions];
    save();
    (window as any).closeModal();
    render();
};

(window as any).deleteTransaction = (id: string) => {
    state.transactions = state.transactions.filter((t: any) => t.id !== id);
    save();
    render();
};

(window as any).askAI = async () => {
    state.activeTab = 'ai';
    state.isAiLoading = true;
    render();

    try {
        const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || "" });
        const prompt = `วิเคราะห์ธุรกรรมนี้: ${JSON.stringify(state.transactions)}. ให้คำแนะนำการออมเงิน 3 ข้อสั้นๆ เป็นภาษาไทย ในรูปแบบ JSON { "insights": [{"title": "...", "recommendation": "..."}] }`;
        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(result.text || '{"insights":[]}');
        state.aiInsights = data.insights || [];
    } catch (e) {
        state.aiInsights = [{title: "ขออภัย", recommendation: "ไม่สามารถเรียก AI ได้ในขณะนี้ โปรดตรวจสอบการเชื่อมต่อ"}];
    } finally {
        state.isAiLoading = false;
        render();
    }
};

// --- Renderer ---
function render() {
    const root = document.getElementById('root');
    if (!root) return;

    const summary = getSummary();
    const t = T[state.lang];

    root.innerHTML = `
        <div class="max-w-md mx-auto p-6 pt-10 pb-32">
            <!-- Header -->
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h1 class="text-2xl font-bold text-white">${t.greet}</h1>
                    <p class="text-slate-500 text-xs">Manage your wealth wisely</p>
                </div>
                <button onclick="toggleLang()" class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold">${state.lang.toUpperCase()}</button>
            </div>

            <!-- Dashboard -->
            <div class="space-y-6">
                <!-- Balance Card -->
                <div class="glass p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-indigo-500/10">
                    <div class="absolute -top-4 -right-4 opacity-5"><i data-lucide="wallet" class="w-32 h-32"></i></div>
                    <p class="text-xs text-indigo-300 uppercase font-bold tracking-widest mb-2">${t.balance}</p>
                    <h2 class="text-4xl font-bold text-white mb-8">฿${summary.bal.toLocaleString()}</h2>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-emerald-500/10 p-3 rounded-2xl">
                            <p class="text-[10px] text-emerald-500 uppercase font-bold mb-1">${t.income}</p>
                            <p class="text-emerald-400 font-bold">฿${summary.inc.toLocaleString()}</p>
                        </div>
                        <div class="bg-rose-500/10 p-3 rounded-2xl">
                            <p class="text-[10px] text-rose-500 uppercase font-bold mb-1">${t.expense}</p>
                            <p class="text-rose-400 font-bold">฿${summary.exp.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <!-- Tabs Content -->
                <div class="mt-8">
                    ${renderTab(t)}
                </div>
            </div>
        </div>

        <!-- Add Button -->
        <button onclick="openModal()" class="fixed bottom-24 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center active:scale-90 transition-transform z-40">
            <i data-lucide="plus" class="w-8 h-8"></i>
        </button>

        <!-- Navbar -->
        <nav class="fixed bottom-0 left-0 right-0 h-20 glass border-t border-white/5 flex justify-around items-center px-6 z-50">
            <button onclick="setTab('dashboard')" class="flex flex-col items-center ${state.activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}">
                <i data-lucide="layout-grid" class="w-6 h-6"></i>
                <span class="text-[10px] mt-1">Home</span>
            </button>
            <button onclick="setTab('history')" class="flex flex-col items-center ${state.activeTab === 'history' ? 'text-indigo-400' : 'text-slate-500'}">
                <i data-lucide="list" class="w-6 h-6"></i>
                <span class="text-[10px] mt-1">${t.history}</span>
            </button>
            <button onclick="askAI()" class="flex flex-col items-center ${state.activeTab === 'ai' ? 'text-indigo-400' : 'text-slate-500'}">
                <i data-lucide="sparkles" class="w-6 h-6"></i>
                <span class="text-[10px] mt-1">AI</span>
            </button>
        </nav>

        <!-- Modal -->
        <div id="modal" class="hidden fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-end">
            <div class="w-full bg-slate-900 rounded-t-[3rem] p-8 pb-12 space-y-6">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold">${t.add}</h3>
                    <button onclick="closeModal()" class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="flex bg-slate-800 p-1.5 rounded-2xl">
                    <button onclick="setFormType('expense')" id="btn-exp" class="flex-1 py-3 rounded-xl font-bold text-xs uppercase transition-all">💸 ${t.expense}</button>
                    <button onclick="setFormType('income')" id="btn-inc" class="flex-1 py-3 rounded-xl font-bold text-xs uppercase transition-all">💰 ${t.income}</button>
                </div>

                <div class="space-y-4">
                    <div class="relative">
                        <span class="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-bold text-indigo-500">฿</span>
                        <input type="number" id="form-amt" placeholder="0.00" class="w-full bg-slate-800/50 p-6 pl-14 rounded-3xl text-4xl font-bold outline-none border border-white/5 focus:border-indigo-500/50 transition-all">
                    </div>
                    
                    <select id="form-cat" class="w-full bg-slate-800/50 p-5 rounded-2xl outline-none border border-white/5 appearance-none">
                        ${CATEGORIES[state.lang].expense.map((c: string) => `<option value="${c}">${c}</option>`).join('')}
                    </select>

                    <button onclick="addTransaction()" class="w-full bg-indigo-600 py-5 rounded-3xl font-bold text-lg shadow-xl shadow-indigo-600/30 active:scale-95 transition-transform">
                        ${t.save}
                    </button>
                </div>
            </div>
        </div>
    `;

    if ((window as any).lucide) (window as any).lucide.createIcons();
}

function renderTab(t: any) {
    if (state.activeTab === 'dashboard') {
        const recent = state.transactions.slice(0, 5);
        return `
            <div class="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div class="flex justify-between items-center">
                    <h3 class="font-bold text-slate-400 text-sm uppercase tracking-widest">${t.recent}</h3>
                    <button onclick="setTab('history')" class="text-xs text-indigo-400 font-bold">See all</button>
                </div>
                <div class="space-y-3">
                    ${recent.map((tr: any) => `
                        <div class="glass p-4 rounded-3xl flex justify-between items-center group">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-2xl ${tr.type === 'income' ? 'bg-emerald-500/20' : 'bg-rose-500/20'} flex items-center justify-center">
                                    <i data-lucide="${tr.type === 'income' ? 'trending-up' : 'trending-down'}" class="w-6 h-6 ${tr.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}"></i>
                                </div>
                                <div>
                                    <p class="font-bold text-sm text-white">${tr.category}</p>
                                    <p class="text-[10px] text-slate-500">${new Date(tr.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <p class="font-bold text-sm ${tr.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}">
                                ${tr.type === 'income' ? '+' : '-'} ฿${tr.amount.toLocaleString()}
                            </p>
                        </div>
                    `).join('')}
                    ${recent.length === 0 ? `<div class="text-center py-12 opacity-30 italic">${t.empty}</div>` : ''}
                </div>
            </div>
        `;
    }

    if (state.activeTab === 'history') {
        return `
            <div class="space-y-3 animate-in fade-in duration-300">
                <h3 class="font-bold text-slate-400 text-sm mb-4">${t.history}</h3>
                ${state.transactions.map((tr: any) => `
                    <div class="glass p-4 rounded-3xl flex justify-between items-center">
                        <div class="flex items-center gap-4">
                             <div>
                                <p class="font-bold text-sm">${tr.category}</p>
                                <p class="text-[10px] text-slate-500">${new Date(tr.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <p class="font-bold text-sm ${tr.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}">฿${tr.amount.toLocaleString()}</p>
                            <button onclick="deleteTransaction('${tr.id}')" class="text-slate-600 hover:text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (state.activeTab === 'ai') {
        return `
            <div class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div class="bg-indigo-600 p-6 rounded-[2rem] shadow-xl shadow-indigo-600/20">
                    <h4 class="font-bold flex items-center gap-2 text-white mb-2"><i data-lucide="brain"></i> AI Financial Advisor</h4>
                    <p class="text-xs text-indigo-100 opacity-80 leading-relaxed">เราจะวิเคราะห์พฤติกรรมการใช้เงินของคุณเพื่อให้คุณออมเงินได้มากขึ้น!</p>
                </div>

                ${state.isAiLoading ? `
                    <div class="p-20 text-center space-y-4">
                        <div class="animate-spin inline-block"><i data-lucide="loader-2" class="w-10 h-10 text-indigo-500"></i></div>
                        <p class="text-sm text-slate-500 animate-pulse">${t.analyzing}</p>
                    </div>
                ` : `
                    <div class="space-y-4">
                        ${state.aiInsights.map((ins: any) => `
                            <div class="glass p-6 rounded-[2rem] border-l-4 border-indigo-500">
                                <h5 class="font-bold text-indigo-400 text-sm mb-2">${ins.title}</h5>
                                <p class="text-xs text-slate-400 leading-relaxed">${ins.recommendation}</p>
                            </div>
                        `).join('')}
                        <button onclick="askAI()" class="w-full bg-slate-800 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest text-indigo-400 mt-4">
                            <i data-lucide="refresh-cw" class="w-3 h-3 inline mr-1"></i> Refresh Analysis
                        </button>
                    </div>
                `}
            </div>
        `;
    }
    return '';
}

// Boot
window.onload = () => {
    render();
};

// Initial Render
render();
