
import { GoogleGenAI } from "@google/genai";

// --- Configuration & State ---
let state = {
    lang: localStorage.getItem('ww_lang') || 'th',
    transactions: JSON.parse(localStorage.getItem('ww_transactions') || '[]'),
    activeTab: 'dashboard',
    aiInsights: [] as any[],
    isAiLoading: false
};

const CATEGORIES: Record<string, string[]> = {
    th: ['ค่าอาหาร', 'อุปกรณ์เรียน', 'เดินทาง', 'ที่พัก', 'สังสรรค์', 'ช้อปปิ้ง', 'อื่นๆ'],
    en: ['Food', 'Study', 'Travel', 'Housing', 'Social', 'Shopping', 'Others']
};

const T: Record<string, any> = {
    th: {
        greet: "สวัสดีจ้า 👋", balance: "เงินคงเหลือ", income: "รายรับ", expense: "รายจ่าย",
        add: "เพิ่มรายการ", history: "ประวัติ", ai: "AI แนะนำ", save: "บันทึก",
        amt: "จำนวนเงิน", cat: "หมวดหมู่", type: "ประเภท", analyzing: "กำลังวิเคราะห์..."
    },
    en: {
        greet: "Hello! 👋", balance: "Balance", income: "Income", expense: "Expense",
        add: "Add New", history: "History", ai: "AI Tips", save: "Save",
        amt: "Amount", cat: "Category", type: "Type", analyzing: "Thinking..."
    }
};

// --- Core Functions ---
function saveState() {
    localStorage.setItem('ww_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('ww_lang', state.lang);
}

function calculateSummary() {
    const inc = state.transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
    const exp = state.transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
    return { inc, exp, bal: inc - exp };
}

// --- Render Engine ---
function render() {
    const app = document.getElementById('app');
    if (!app) return;
    const summary = calculateSummary();
    const t = T[state.lang];

    app.innerHTML = `
        <div class="max-w-md mx-auto p-6 space-y-8">
            <!-- Header -->
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold text-white">${t.greet}</h1>
                    <p class="text-slate-500 text-sm">WealthWisely Smart Manager</p>
                </div>
                <button onclick="toggleLang()" class="p-2 rounded-lg bg-slate-800 text-xs font-bold uppercase">${state.lang}</button>
            </div>

            <!-- Balance Card -->
            <div class="glass p-6 rounded-[2rem] relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-10"><i data-lucide="wallet" class="w-20 h-20"></i></div>
                <p class="text-sm text-indigo-300 uppercase tracking-wider mb-1">${t.balance}</p>
                <h2 class="text-4xl font-bold text-white">฿${summary.bal.toLocaleString()}</h2>
                <div class="flex gap-4 mt-6">
                    <div class="flex-1">
                        <p class="text-[10px] text-slate-500 uppercase">${t.income}</p>
                        <p class="text-emerald-400 font-bold">฿${summary.inc.toLocaleString()}</p>
                    </div>
                    <div class="flex-1 border-l border-slate-700 pl-4">
                        <p class="text-[10px] text-slate-500 uppercase">${t.expense}</p>
                        <p class="text-rose-400 font-bold">฿${summary.exp.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <!-- Content Switcher -->
            ${renderTabContent(t, summary)}

        </div>

        <!-- Floating Button -->
        <button onclick="openModal()" class="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center text-white active:scale-90 transition-transform z-40">
            <i data-lucide="plus" class="w-8 h-8"></i>
        </button>

        <!-- Bottom Navigation -->
        <nav class="fixed bottom-0 left-0 right-0 h-20 glass border-t border-slate-800 flex justify-around items-center px-4 z-50">
            <button onclick="setTab('dashboard')" class="flex flex-col items-center ${state.activeTab === 'dashboard' ? 'text-indigo-500' : 'text-slate-500'}">
                <i data-lucide="layout-grid" class="w-6 h-6"></i>
                <span class="text-[10px] mt-1">Home</span>
            </button>
            <button onclick="setTab('history')" class="flex flex-col items-center ${state.activeTab === 'history' ? 'text-indigo-500' : 'text-slate-500'}">
                <i data-lucide="list" class="w-6 h-6"></i>
                <span class="text-[10px] mt-1">${t.history}</span>
            </button>
            <button onclick="askAI()" class="flex flex-col items-center ${state.activeTab === 'ai' ? 'text-indigo-500' : 'text-slate-500'}">
                <i data-lucide="sparkles" class="w-6 h-6"></i>
                <span class="text-[10px] mt-1">AI</span>
            </button>
        </nav>

        <!-- Modal -->
        <div id="modal" class="hidden fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-end">
            <div class="w-full bg-slate-900 rounded-t-[2.5rem] p-8 space-y-6 transform translate-y-0 transition-transform">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold">${t.add}</h3>
                    <button onclick="closeModal()" class="text-slate-500"><i data-lucide="x"></i></button>
                </div>
                <div class="space-y-4">
                    <div class="flex p-1 bg-slate-800 rounded-xl">
                        <button onclick="window.formType='expense'" id="btn-exp" class="flex-1 py-2 rounded-lg bg-indigo-600 font-bold text-xs uppercase">${t.expense}</button>
                        <button onclick="window.formType='income'" id="btn-inc" class="flex-1 py-2 rounded-lg font-bold text-xs uppercase opacity-40">รายรับ</button>
                    </div>
                    <input type="number" id="form-amt" placeholder="0.00" class="w-full bg-transparent text-center text-5xl font-bold outline-none text-white py-4" autofocus>
                    <select id="form-cat" class="w-full bg-slate-800 p-4 rounded-2xl outline-none">
                        ${CATEGORIES[state.lang].map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <button onclick="addTransaction()" class="w-full bg-indigo-600 py-4 rounded-2xl font-bold text-white shadow-xl shadow-indigo-500/20">${t.save}</button>
                </div>
            </div>
        </div>
    `;
    
    // Initialize Icons
    // Fix: Access lucide on window using any cast
    if ((window as any).lucide) (window as any).lucide.createIcons();
}

function renderTabContent(t: any, summary: any) {
    if (state.activeTab === 'dashboard') {
        return `
            <div class="space-y-4">
                <h3 class="font-bold text-slate-400 uppercase text-xs tracking-widest">รายการล่าสุด</h3>
                <div class="space-y-3">
                    ${state.transactions.slice(0, 5).map((tr: any) => `
                        <div class="glass p-4 rounded-2xl flex justify-between items-center">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                                    <i data-lucide="${tr.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'}" class="w-5 h-5 ${tr.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}"></i>
                                </div>
                                <div>
                                    <p class="font-bold text-sm">${tr.category}</p>
                                    <p class="text-[10px] text-slate-500">${new Date(tr.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <p class="font-bold ${tr.type === 'income' ? 'text-emerald-500' : 'text-rose-400'}">
                                ${tr.type === 'income' ? '+' : '-'}฿${tr.amount.toLocaleString()}
                            </p>
                        </div>
                    `).join('')}
                    ${state.transactions.length === 0 ? `<p class="text-center py-10 opacity-30">ยังไม่มีประวัติการบันทึก</p>` : ''}
                </div>
            </div>
        `;
    } else if (state.activeTab === 'history') {
        return `
            <div class="space-y-3">
                ${state.transactions.map((tr: any) => `
                    <div class="glass p-4 rounded-2xl flex justify-between items-center group">
                        <div class="flex items-center gap-3">
                            <p class="font-bold text-sm">${tr.category}</p>
                        </div>
                        <div class="flex items-center gap-4">
                            <p class="font-bold ${tr.type === 'income' ? 'text-emerald-500' : 'text-rose-400'}">฿${tr.amount.toLocaleString()}</p>
                            <button onclick="deleteTransaction('${tr.id}')" class="text-slate-600 hover:text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (state.activeTab === 'ai') {
        return `
            <div class="space-y-4 animate-in fade-in duration-500">
                <div class="p-6 bg-indigo-600/20 border border-indigo-500/30 rounded-3xl">
                    <h3 class="font-bold flex items-center gap-2"><i data-lucide="brain"></i> AI Financial Advisor</h3>
                </div>
                ${state.isAiLoading ? `
                    <div class="p-10 text-center space-y-4">
                        <div class="animate-spin inline-block"><i data-lucide="refresh-cw"></i></div>
                        <p class="text-sm opacity-50">${t.analyzing}</p>
                    </div>
                ` : `
                    <div class="space-y-3">
                        ${state.aiInsights.map((ins: any) => `
                            <div class="glass p-5 rounded-3xl border-l-4 border-indigo-500">
                                <h4 class="font-bold text-indigo-400 mb-1">${ins.title}</h4>
                                <p class="text-sm text-slate-400 leading-relaxed">${ins.recommendation}</p>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }
    return '';
}

// --- Interaction Handlers ---
// Fix: Use any cast on window to define global functions
(window as any).setTab = (tab: string) => {
    state.activeTab = tab;
    render();
};

(window as any).toggleLang = () => {
    state.lang = state.lang === 'th' ? 'en' : 'th';
    saveState();
    render();
};

(window as any).openModal = () => {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('hidden');
    (window as any).formType = 'expense';
};

(window as any).closeModal = () => {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('hidden');
};

(window as any).addTransaction = () => {
    // Fix: Cast elements to specific types to access .value property
    const amtInput = document.getElementById('form-amt') as HTMLInputElement;
    const catSelect = document.getElementById('form-cat') as HTMLSelectElement;
    const amt = parseFloat(amtInput?.value || '0');
    const cat = catSelect?.value;
    if (!amt) return alert('กรุณาระบุจำนวนเงิน');

    const tr = {
        id: Date.now().toString(),
        type: (window as any).formType || 'expense',
        amount: amt,
        category: cat,
        date: new Date().toISOString()
    };

    state.transactions = [tr, ...state.transactions];
    saveState();
    // Fix: Call closeModal from window scope
    (window as any).closeModal();
    render();
};

(window as any).deleteTransaction = (id: string) => {
    state.transactions = state.transactions.filter((t: any) => t.id !== id);
    saveState();
    render();
};

(window as any).askAI = async () => {
    state.activeTab = 'ai';
    state.isAiLoading = true;
    render();

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const prompt = `วิเคราะห์การเงิน: ${JSON.stringify(state.transactions)}. ให้คำแนะนำ 3 ข้อเป็นภาษาไทย ในรูปแบบ JSON array ชื่อ insights โดยมีคีย์คือ title และ recommendation`;
        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(result.text || '{"insights":[]}');
        state.aiInsights = data.insights || [];
    } catch (e) {
        state.aiInsights = [{title: "Error", recommendation: "ไม่สามารถติดต่อ AI ได้ในขณะนี้"}];
    } finally {
        state.isAiLoading = false;
        render();
    }
};

// Start
render();
