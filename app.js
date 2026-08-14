(() => {
  "use strict";

  const STORAGE_KEY = "budgetBook.v1";
  const SETTINGS_KEY = "budgetBook.settings.v1";

  const DEFAULT_CATEGORIES = [
    ["Church", "expense"], ["T/H/LINGAP", "expense"], ["LAGAK", "expense"],
    ["Travel Expense", "expense"], ["Allowance", "expense"], ["Parents / Grandparents", "expense"],
    ["Pay Later", "expense"], ["COD / Treat / Shopping", "expense"], ["Savings", "savings"],
    ["Emergency Savings", "savings"], ["Others", "expense"]
  ];

  const state = {
    data: loadData(),
    settings: loadSettings(),
    view: "dashboard",
    currentBudgetId: null,
    transactionSearch: "",
    historySearch: ""
  };

  function uid(prefix="id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { budgets: [], activeBudgetId: null };
      const parsed = JSON.parse(raw);
      const budgets = Array.isArray(parsed.budgets) ? parsed.budgets : [];
      // Lightweight migration so future versions can safely open older records.
      budgets.forEach(b => {
        b.categories = Array.isArray(b.categories) ? b.categories : [];
        b.transactions = Array.isArray(b.transactions) ? b.transactions : [];
        b.savingsGoals = Array.isArray(b.savingsGoals) ? b.savingsGoals : [];
        b.reminders = Array.isArray(b.reminders) ? b.reminders : [];
        b.actualCash = num(b.actualCash);
        b.transactions.forEach(t => {
          if (!t.paymentMethod) t.paymentMethod = "Cash";
          if (!t.note) t.note = "";
        });
      });
      return { budgets, activeBudgetId: parsed.activeBudgetId || budgets[0]?.id || null };
    } catch { return { budgets: [], activeBudgetId: null }; }
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { currency: "₱", theme: "light", ...(JSON.parse(raw) || {}) } : { currency:"₱", theme:"light" };
    } catch { return { currency:"₱", theme:"light" }; }
  }

  let saveTimer;
  function saveData() {
    clearTimeout(saveTimer);
    document.getElementById("saveStatus").textContent = "Saving…";
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
      document.getElementById("saveStatus").textContent = "All changes saved";
    }, 180);
  }

  function money(value) {
    const n = Number(value) || 0;
    const sign = n < 0 ? "-" : "";
    return `${sign}${state.settings.currency}${Math.abs(n).toLocaleString("en-PH", {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  }
  function num(value) {
    const cleaned = String(value ?? "").replace(/,/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function numberText(value, decimals = 2) {
    return num(value).toLocaleString("en-PH", {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  }

  function moneyInputValue(value) {
    const n = num(value);
    return n ? numberText(n) : "0";
  }
  function isoToday() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function addDays(dateValue, days) {
    const d = new Date(`${dateValue}T00:00:00`);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function dateText(value) {
    if (!value) return ", ";
    const d = new Date(`${value}T00:00:00`);
    return d.toLocaleDateString("en-PH", {month:"short", day:"numeric", year:"numeric"});
  }
  function shortDate(value) {
    if (!value) return "";
    const d = new Date(`${value}T00:00:00`);
    return d.toLocaleDateString("en-PH", {month:"short", day:"numeric"});
  }
  function escapeHtml(str="") {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  function getBudget(id=state.currentBudgetId) {
    return state.data.budgets.find(b => b.id === id) || null;
  }
  function activeBudget() {
    return getBudget(state.data.activeBudgetId) || state.data.budgets[0] || null;
  }
  function setActiveBudget(id) {
    state.data.activeBudgetId = id;
    state.currentBudgetId = id;
    saveData();
  }

  function categoryDefaults() {
    return DEFAULT_CATEGORIES.map(([name,type]) => ({
      id: uid("cat"), name, type, days: type === "savings" ? 1 : 1, amountPerDay: 0, actualAmount: 0
    }));
  }

  function newBudgetObject({sample=false, source=null}={}) {
    const today = isoToday();
    const end = new Date(`${today}T00:00:00`);
    end.setDate(end.getDate()+14);
    const endDate = end.toISOString().slice(0,10);
    const categories = source
      ? source.categories.map(c => ({...c, id:uid("cat"), actualAmount:0}))
      : categoryDefaults();
    const b = {
      id: uid("budget"),
      name: sample ? "Sample Budget" : "New Budget",
      startDate: today,
      endDate,
      income: sample ? 15000 : 0,
      categories,
      transactions: [],
      savingsGoals: sample ? [{
        id:uid("goal"), name:"Emergency Fund", target:20000, saved:8000, note:"Sample goal"
      }] : [],
      reminders: [],
      notes: sample ? "This is sample data based on the original budgeting idea. Replace it with your own figures." : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (sample) {
      const vals = [50,50,100,40,50,1000,1500,1500,500,500,0];
      const days = [6,2,2,15,15,1,1,1,1,1,1];
      b.categories.forEach((c,i) => { c.amountPerDay=vals[i]||0; c.days=days[i]||1; });
      b.transactions = [
        {id:uid("tx"), date:today, categoryId:b.categories[3].id, description:"Jeepney / commute", amount:30},
        {id:uid("tx"), date:today, categoryId:b.categories[7].id, description:"Small treat", amount:80}
      ];
    }
    return b;
  }

  function budgetStats(b) {
    if (!b) return {plannedExpense:0, plannedSavings:0, allocated:0, remaining:0, actual:0, actualExpense:0, actualSavings:0, actualRemaining:0, variance:0, daily:0, days:1};
    let plannedExpense=0, plannedSavings=0;
    b.categories.forEach(c => {
      const total = num(c.days) * num(c.amountPerDay);
      if (c.type === "savings") plannedSavings += total;
      else plannedExpense += total;
    });
    const allocated = plannedExpense + plannedSavings;
    const remaining = num(b.income) - allocated;
    const actual = b.categories.reduce((s,c) => s + num(c.actualAmount),0);
    const actualRemaining = num(b.income) - actual;
    const variance = actualRemaining - remaining;
    const start = new Date(`${b.startDate}T00:00:00`);
    const end = new Date(`${b.endDate}T00:00:00`);
    const days = Math.max(1, Math.floor((end-start)/86400000)+1);
    const daily = num(b.income) / days;
    const actualExpense = b.categories.filter(c=>c.type !== "savings").reduce((sum,c)=>sum + num(c.actualAmount),0);
    const actualSavings = b.categories.filter(c=>c.type === "savings").reduce((sum,c)=>sum + num(c.actualAmount),0);
    return {plannedExpense, plannedSavings, allocated, remaining, actual, actualExpense, actualSavings, actualRemaining, variance, daily, days};
  }

  function totalsFromTransactions(b) {
    return (b?.transactions || []).reduce((sum,t) => sum + num(t.amount),0);
  }

  function categoryActualFromTransactions(b, catId) {
    return (b?.transactions || []).filter(t=>t.categoryId===catId).reduce((s,t)=>s+num(t.amount),0);
  }

  function categoryPlanned(c) { return num(c.days) * num(c.amountPerDay); }

  function syncActuals(b) {
    b.categories.forEach(c => {
      const txActual = categoryActualFromTransactions(b,c.id);
      if (b.transactions.length) c.actualAmount = txActual;
    });
  }

  function budgetPeriodLabel(b) {
    if (!b) return "";
    return `${shortDate(b.startDate)} hanggang ${dateText(b.endDate)}`;
  }

  const TUTORIALS = {
    dashboard: {
      title: "Eto po lablab, dito ka magsisimula",
      intro: "Ginawa ko po ito para mas madali mong ayusin yung budget mo. Hindi mo na kailangang magsulat ulit sa papel. Ilagay mo lang yung pera mo, ayusin yung plano, tapos record mo agad yung totoong gastos.",
      steps: [
        ["1", "Overview", "Dito mo agad makikita kung magkano yung pera mo, magkano yung naka-plan, magkano na yung nagastos, at magkano pa yung natira."],
        ["2", "New Budget", "Kapag bagong sweldo o bagong cutoff, pindutin mo ito po. Ilagay mo yung dates at total na budget mo."],
        ["3", "Add Expense", "Kapag may binili o binayaran ka, i-record mo agad dito para hindi mo na kailangang alalahanin mamaya."],
        ["4", "History", "Dito naka-save yung mga dati mong budget. May date bawat record para madali mong balikan."],
        ["5", "Print", "Kung gusto mo ng physical copy, pindutin mo yung Print sa Current Budget. Aayusin na niya yung layout para ready sa papel."]
      ]
    },
    budget: {
      title: "Eto po lablab, dito mo ginagawa yung plano",
      intro: "Ito yung digital version ng budget sheet mo. Dito mo muna pinaplano kung saan mapupunta yung pera bago ka magsimulang gumastos.",
      steps: [
        ["1", "Days", "Ilang araw para sa budget na iyon. Halimbawa, 15 kung pang 15 days yung cutoff."],
        ["2", "Amount per day", "Magkano yung balak mong ilaan bawat araw. Automatic na kukuwentahin yung total."],
        ["3", "Actual", "Pwede mong gamitin ito para sa mabilisang manual total. Pero mas okay ang Transactions kung gusto mong bawat gastos may sariling date at description."],
        ["4", "Difference", "Makikita mo dito kung magkano pa yung natitira sa original plan. Kapag negative, ibig sabihin lumampas ka sa plan."],
        ["5", "Duplicate", "Kapag tapos na yung cutoff, gamitin mo ito para kopyahin yung dating budget. Palitan mo na lang yung dates at amounts na kailangan."]
      ]
    },
    transactions: {
      title: "Eto po lablab, dito mo ilalagay yung totoong gastos",
      intro: "Ito yung pinaka importante kapag ginagamit mo na yung budget. Kapag may binayaran ka, record mo agad para alam mo kung saan talaga napunta yung pera.",
      steps: [
        ["1", "Add Expense", "Pindutin ito kapag may bagong gastos. Ilagay yung date, category, description, amount, at payment method."],
        ["2", "Category", "Piliin kung saan kabilang yung gastos. Halimbawa, Travel, Allowance, Shopping, Bills, o category na ikaw mismo ang gumawa."],
        ["3", "Payment Method", "Piliin kung Cash, GCash, Bank Transfer, Debit/Card, o Other. Useful ito kapag chine-check mo kung tugma yung actual cash mo."],
        ["4", "Note", "Optional lang ito. Pwede mong ilagay kung para saan yung binili mo o may gusto kang tandaan."],
        ["5", "Edit at Delete", "Pindutin yung pencil kung may mali sa record. Pindutin yung X kung gusto mong alisin yung record."]
      ]
    },
    savings: {
      title: "Eto po lablab, para naman sa mga ipon mo",
      intro: "Para hindi mo makalimutan yung mga goal mong ipunin. Makikita mo agad kung magkano na yung naipon at magkano pa yung kulang.",
      steps: [
        ["1", "Savings Goal", "Gumawa ng goal tulad ng Emergency Fund, bagong gamit, tuition, o kahit anong gusto mong pag-ipunan."],
        ["2", "Target", "Ilagay yung total na gusto mong maabot."],
        ["3", "Saved so far", "I-update mo kapag may nadagdag sa ipon mo."],
        ["4", "Progress", "Automatic na makikita kung ilang percent na yung naipon at kung magkano pa yung kailangan."]
      ]
    },
    history: {
      title: "Eto po lablab, dito mo makikita yung mga dati mong budget",
      intro: "Bawat budget may sariling date kaya hindi sila naghahalo. Pwede mong buksan ulit, i-duplicate, o burahin kapag kailangan.",
      steps: [
        ["1", "Search", "Kung marami nang records, gamitin yung search para mabilis mong mahanap yung budget na gusto mo."],
        ["2", "Open", "Buksan yung dating budget kung gusto mong tingnan o baguhin yung record."],
        ["3", "Duplicate", "Kung similar yung next cutoff, i-duplicate mo na lang para hindi ka magsimula ulit sa zero."],
        ["4", "Delete", "Gamitin lang kapag sure ka. Kapag dinelete mo, mawawala yung budget record sa device na iyon."]
      ]
    },
    settings: {
      title: "Eto po lablab, dito yung mga settings",
      intro: "Hindi mo naman kailangang galawin lahat dito. Ito lang yung mga extra settings at backup para mas safe yung records mo.",
      steps: [
        ["1", "Dark Mode", "I-on mo kung mas comfortable kang gamitin yung website sa gabi."],
        ["2", "Currency", "Philippine Peso na agad ang default. Palitan mo lang kung kailangan."],
        ["3", "Backup", "Mag-export ka ng JSON backup paminsan-minsan para may extra copy ka ng records mo."],
        ["4", "CSV", "Useful ito kung gusto mong buksan yung transaction records sa Excel o spreadsheet."],
        ["5", "Offline", "Naka-save sa browser ng device mo yung normal na data. Hindi kailangan ng account o internet para sa basic use."]
      ]
    }
  };

  function openTutorial(section = state.view) {
    const t = TUTORIALS[section] || TUTORIALS.dashboard;
    const labels = {dashboard:"Simula", budget:"Budget", transactions:"Gastos", savings:"Ipon", history:"History", settings:"Settings"};
    const menu = Object.keys(TUTORIALS).map(key => `
      <button class="tutorial-menu-item ${key===section?'active':''}" data-action="tutorial-section" data-id="${key}">
        <span class="tutorial-menu-icon">${key===section?'●':'○'}</span><span>${labels[key]}</span>
      </button>`).join('');
    const body = `
      <div class="tutorial-layout">
        <aside class="tutorial-menu" aria-label="Menu ng tutorial">
          <div class="tutorial-menu-title">Pili ka po dito</div>
          ${menu}
        </aside>
        <section class="tutorial-content">
          <div class="tutorial-intro">
            <div class="tutorial-heart">♡</div>
            <div><div class="eyebrow">Eto po lablab</div><h2>${escapeHtml(t.title)}</h2><p>${escapeHtml(t.intro)}</p></div>
          </div>
          <div class="tutorial-steps">
            ${t.steps.map(([n,title,text]) => `<div class="tutorial-step"><span class="tutorial-number">${n}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div></div>`).join('')}
          </div>
          <div class="tutorial-note"><strong>Tandaan mo po:</strong> Hindi mo kailangang maging expert para gamitin ito. Ang importante, alam mo kung magkano yung meron ka, saan mo planong ilagay, at saan talaga napunta.</div>
        </section>
      </div>
      <div class="modal-foot"><button class="btn primary" data-modal-close>Okay po, gets ko ♡</button></div>`;
    openModal({title:"Para kay Lablab", body, wide:true});
  }

  function featureHelp(section) {
    const t = TUTORIALS[section] || TUTORIALS.dashboard;
    const body = `<div class="tutorial-intro compact"><div class="tutorial-heart">?</div><div><div class="eyebrow">Eto po lablab</div><h2>${escapeHtml(t.title)}</h2><p>${escapeHtml(t.intro)}</p></div></div><div class="tutorial-steps">${t.steps.map(([n,title,text]) => `<div class="tutorial-step"><span class="tutorial-number">${n}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div></div>`).join('')}</div><div class="modal-foot"><button class="btn primary" data-modal-close>Okay po, gets ko na ♡</button></div>`;
    openModal({title:"Eto po lablab", body, wide:true});
  }

  function renderAll() {
    renderDashboard();
    renderBudget();
    renderTransactions();
    renderSavings();
    renderHistory();
    renderSettings();
    updateNavigation();
  }

  function updateNavigation() {
    document.querySelectorAll("[data-view]").forEach(el => {
      el.classList.toggle("active", el.dataset.view === state.view);
    });
    document.querySelectorAll(".view").forEach(el => {
      el.classList.toggle("active", el.id === `view-${state.view}`);
    });
  }

  function navigate(view) {
    state.view = view;
    if (view === "budget" && !state.currentBudgetId) {
      state.currentBudgetId = activeBudget()?.id || null;
    }
    renderAll();
    window.scrollTo({top:0, behavior:"smooth"});
    document.getElementById("sidebar")?.classList.remove("open");
  }

  function timeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: "Good morning, Lablab ☀️", message: "Tara, ayusin natin yung budget mo today." };
    if (hour < 18) return { greeting: "Good afternoon, Lablab 🌷", message: "Check natin kung okay pa yung spending mo." };
    return { greeting: "Good evening, Lablab 🌙", message: "Tingnan natin kung kumusta yung budget mo today." };
  }

  function renderDashboard() {
    const el = document.getElementById("view-dashboard");
    const b = activeBudget();
    if (!b) {
      el.innerHTML = `
        <div class="hero cute-hero">
          <div class="hero-copy"><div class="eyebrow">Made especially for you, Lablab ♡</div><h2>Hi Lablab 🌷</h2>
          <p class="page-sub">Eto na po yung little budget space mo. Dito mo na pwedeng ayusin yung pera mo, record yung gastos, at bantayan yung ipon mo.</p><div class="hero-signoff">Your lablab made this for you · Kenjie Reyes ♡</div></div>
          <div class="cute-mascot" aria-hidden="true"><span class="ear ear-left"></span><span class="ear ear-right"></span><div class="mascot-face"><span>•</span><span>•</span><b>⌣</b></div><div class="mascot-calculator">₱</div></div>
          <div class="actions"><button class="btn" data-action="new-budget">＋ Create budget</button><button class="btn" data-action="tutorial">Eto po lablab ♡</button></div>
        </div>
        <div class="grid grid-3 section">
          <div class="card"><div class="eyebrow">01</div><h3>Plan</h3><p class="page-sub">Set your available money and decide where it should go.</p></div>
          <div class="card"><div class="eyebrow">02</div><h3>Track</h3><p class="page-sub">Record actual spending without losing the original plan.</p></div>
          <div class="card"><div class="eyebrow">03</div><h3>Review</h3><p class="page-sub">Return to any previous budget and print a clean copy anytime.</p></div>
        </div>`;
      return;
    }
    syncActuals(b);
    const s = budgetStats(b);
    const over = s.remaining < 0;
    const todayStr = isoToday();
    const todayTx = b.transactions.filter(t=>t.date===todayStr).reduce((x,t)=>x+num(t.amount),0);
    const todayBudget = Math.max(0, s.daily - todayTx);
    const recent = [...b.transactions].sort((a,z)=>z.date.localeCompare(a.date)).slice(0,5);
    const catMap = Object.fromEntries(b.categories.map(c=>[c.id,c]));
    el.innerHTML = `
      <div class="page-head cute-page-head">
        <div><div class="eyebrow">Made especially for you, Lablab ♡</div><h1>${timeGreeting().greeting}</h1><p class="page-sub">${timeGreeting().message}</p><div class="budget-period-pill">${escapeHtml(b.name)} · ${budgetPeriodLabel(b)}</div></div>
        <div class="actions"><button class="btn subtle-help" data-action="feature-help" data-id="dashboard">Paano gamitin?</button><button class="btn" data-action="new-budget">＋ New budget</button><button class="btn primary" data-action="add-expense">＋ Add expense</button></div>
      </div>
      <div class="grid grid-4">
        <div class="card metric"><span class="label">Available money</span><span class="value">${money(b.income)}</span><span class="hint">Starting amount</span></div>
        <div class="card metric"><span class="label">Planned expenses</span><span class="value">${money(s.plannedExpense)}</span><span class="hint">${money(s.plannedSavings)} planned for savings</span></div>
        <div class="card metric ${s.remaining<0?'negative':''}"><span class="label">Expected remaining</span><span class="value">${money(s.remaining)}</span><span class="hint">${over ? "Over the available budget" : "After planned allocations"}</span></div>
        <div class="card metric ${s.actualRemaining<0?'negative':''}"><span class="label">Actual remaining</span><span class="value">${money(s.actualRemaining)}</span><span class="hint">${s.actual ? money(s.actualExpense)+" spent" : "No actual spending recorded yet"}</span></div>
      </div>
      ${over ? `<div class="danger-banner section">Your planned allocations are ${money(Math.abs(s.remaining))} above available money. You can still save this plan and adjust it later.</div>` : ""}
      <div class="grid grid-2 section">
        <div class="card">
          <div class="section-head"><div><h2>Today</h2><p class="page-sub">${dateText(todayStr)}</p></div><span class="chip">${s.days} day period</span></div>
          <div class="detail-grid">
            <div class="detail-box"><small>Suggested daily budget</small><strong>${money(s.daily)}</strong></div>
            <div class="detail-box"><small>Recorded today</small><strong>${money(todayTx)}</strong></div>
          </div>
          <div style="margin-top:14px"><div class="kpi-row"><span>Available for today</span><strong class="${todayBudget<0?'bad':'good'}">${money(todayBudget)}</strong></div></div>
        </div>
        <div class="card">
          <div class="section-head"><div><h2>Budget at a glance</h2><p class="page-sub">Planned allocation</p></div><button class="btn small" data-action="go-budget">Open budget</button></div>
          <div class="kpi-row"><span>Expenses</span><strong>${money(s.plannedExpense)}</strong></div>
          <div class="kpi-row"><span>Savings</span><strong>${money(s.plannedSavings)}</strong></div>
          <div class="kpi-row"><span>Remaining</span><strong class="${s.remaining<0?'bad':'good'}">${money(s.remaining)}</strong></div>
          <div class="kpi-row"><span>Actual remaining</span><strong class="${s.actualRemaining<0?'bad':'good'}">${money(s.actualRemaining)}</strong></div>
        </div>
      </div>
      <div class="grid grid-2 section">
        <div class="card">
          <div class="section-head"><div><h2>Recent activity</h2><p class="page-sub">Latest recorded transactions</p></div><button class="btn small" data-action="go-transactions">View all</button></div>
          ${recent.length ? `<div class="list">${recent.map(t=>`
            <div class="list-item"><div class="list-main"><strong>${escapeHtml(t.description)}</strong><small>${dateText(t.date)} · ${escapeHtml(catMap[t.categoryId]?.name || "Other")} · ${escapeHtml(t.paymentMethod||"Cash")}</small></div><span class="list-amount">${money(t.amount)}</span></div>`).join("")}</div>` : `<div class="empty"><strong>No activity yet</strong>Add an expense when you want to start tracking actual spending.</div>`}
        </div>
        <div class="card">
          <div class="section-head"><div><h2>Savings</h2><p class="page-sub">Your goals in this budget</p></div><button class="btn small" data-action="go-savings">View savings</button></div>
          ${b.savingsGoals.length ? b.savingsGoals.slice(0,3).map(g=>`
            <div class="goal-card" style="margin-bottom:14px"><div class="goal-top"><strong>${escapeHtml(g.name)}</strong><span class="goal-percent">${Math.min(100,(num(g.saved)/Math.max(1,num(g.target))*100)).toFixed(0)}%</span></div><div class="progress"><span style="width:${Math.min(100,(num(g.saved)/Math.max(1,num(g.target))*100))}%"></span></div><div class="kpi-row"><span>${money(g.saved)} saved</span><strong>${money(Math.max(0,num(g.target)-num(g.saved)))} left</strong></div></div>`).join("") : `<div class="empty"><strong>No savings goals</strong>Add one when you want to track a target.</div>`}
        </div>
      </div>
      <div class="lablab-footer-card">
        <span class="footer-sparkle">✦</span>
        <div><strong>Made especially for Lablab ♡</strong><small>Para mas madali yung everyday budgeting mo.</small></div>
        <span class="footer-name">Kenjie Reyes · © 2026</span>
      </div>`;
  }

  function renderBudget() {
    const el = document.getElementById("view-budget");
    const b = getBudget(state.currentBudgetId) || activeBudget();
    if (!b) {
      el.innerHTML = `<div class="empty card"><strong>No budget selected</strong>Create a budget from Overview or History.</div>`;
      return;
    }
    state.currentBudgetId = b.id;
    syncActuals(b);
    const s = budgetStats(b);
    const rows = b.categories.map(c=>{
      const planned = categoryPlanned(c);
      const actual = num(c.actualAmount);
      const diff = planned - actual;
      return `<tr>
        <td><strong>${escapeHtml(c.name)}</strong><br><span class="chip">${c.type === "savings" ? "Savings" : "Expense"}</span></td>
        <td><input type="number" min="1" step="1" value="${num(c.days)}" data-cat="${c.id}" data-field="days" aria-label="${escapeHtml(c.name)} days"></td>
        <td><div class="input-prefix"><span>${escapeHtml(state.settings.currency)}</span><input type="text" inputmode="decimal" value="${moneyInputValue(c.amountPerDay)}" data-money-input data-cat="${c.id}" data-field="amountPerDay" aria-label="${escapeHtml(c.name)} amount per day"></div></td>
        <td class="num"><strong>${money(planned)}</strong></td>
        <td><div class="input-prefix"><span>${escapeHtml(state.settings.currency)}</span><input type="text" inputmode="decimal" value="${moneyInputValue(actual)}" data-money-input data-cat="${c.id}" data-field="actualAmount" aria-label="${escapeHtml(c.name)} actual"></div></td>
        <td class="num ${diff<0?'bad':'good'}">${money(diff)}</td>
        <td><div class="category-actions"><button class="icon-mini" title="Rename category" data-action="rename-category" data-id="${c.id}">✎</button><button class="icon-mini" title="Delete category" data-action="delete-category" data-id="${c.id}">×</button></div></td>
      </tr>`;
    }).join("");
    el.innerHTML = `
      <div class="page-head">
        <div><div class="eyebrow">Planning</div><h1>${escapeHtml(b.name)}</h1><p class="page-sub">${budgetPeriodLabel(b)} · Updated ${new Date(b.updatedAt).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</p></div>
        <div class="actions">
          <button class="btn" data-action="duplicate-budget">Duplicate</button>
          <button class="btn" data-action="print-budget">Print</button>
          <button class="btn subtle-help" data-action="feature-help" data-id="budget">Paano gamitin?</button><button class="btn primary" data-action="add-category">＋ Category</button>
        </div>
      </div>
      <div class="card">
        <div class="budget-head">
          <div><div class="eyebrow">Budget details</div><h2>${escapeHtml(b.name)}</h2><div class="budget-meta"><span class="chip">${dateText(b.startDate)}</span><span class="chip">to ${dateText(b.endDate)}</span><span class="chip">${s.days} days</span></div></div>
          <div class="budget-total-box">
            <div class="money-line"><span>Available</span><strong>${money(b.income)}</strong></div>
            <div class="money-line"><span>Allocated</span><strong>${money(s.allocated)}</strong></div>
            <div class="money-line"><span>Remaining</span><strong class="${s.remaining<0?'bad':'good'}">${money(s.remaining)}</strong></div>
          </div>
        </div>
        <div class="section">
          ${s.remaining<0 ? `<div class="warning-banner">This plan is over the available money by <strong>${money(Math.abs(s.remaining))}</strong>. Review the rows below if needed.</div>` : ""}
          <div class="table-wrap">
            <table>
              <thead><tr><th>Category</th><th>Days</th><th>Amount / day</th><th class="num">Planned total</th><th>Actual</th><th class="num">Difference</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr>
                <th colspan="3">Totals</th><th class="num">${money(s.plannedExpense+s.plannedSavings)}</th><th class="num">${money(s.actual)}</th><th class="num ${(s.allocated-s.actual)<0?'bad':'good'}">${money(s.allocated-s.actual)}</th><th></th>
              </tr></tfoot>
            </table>
          </div>
        </div>
      </div>
      <div class="grid grid-2 section">
        <div class="card">
          <div class="section-head"><div><h2>Actual cash</h2><p class="page-sub">Compare what you have with what the plan expects.</p></div></div>
          <div class="form-grid">
            <div class="field"><label>Actual cash on hand</label><div class="input-prefix"><span>${escapeHtml(state.settings.currency)}</span><input id="actualCashInput" type="text" inputmode="decimal" data-money-input value="${moneyInputValue(b.actualCash || 0)}"></div></div>
            <div class="field"><label>Expected cash after actuals</label><input value="${money(s.actualRemaining)}" readonly></div>
          </div>
          <div class="kpi-row" style="margin-top:12px"><span>Cash variance</span><strong class="${num(b.actualCash)-s.actualRemaining<0?'bad':'good'}">${money(num(b.actualCash)-s.actualRemaining)}</strong></div>
        </div>
        <div class="card">
          <div class="section-head"><div><h2>Notes</h2><p class="page-sub">Keep anything useful for this budget period.</p></div></div>
          <textarea id="budgetNotes" placeholder="e.g. salary comes in on the 15th...">${escapeHtml(b.notes || "")}</textarea>
        </div>
      </div>
      <div class="section actions"><button class="btn primary" data-action="save-now">Save budget</button><button class="btn" data-action="print-budget">Print budget</button></div>`;
  }

  function renderTransactions() {
    const el = document.getElementById("view-transactions");
    const b = activeBudget();
    if (!b) { el.innerHTML = `<div class="empty card"><strong>Create a budget first</strong>Transactions belong to a budget period.</div>`; return; }
    const q = state.transactionSearch.toLowerCase();
    const cats = Object.fromEntries(b.categories.map(c=>[c.id,c]));
    const txs = [...b.transactions].filter(t => `${t.description} ${cats[t.categoryId]?.name || ""} ${t.date} ${t.paymentMethod || ""}`.toLowerCase().includes(q)).sort((a,z)=>z.date.localeCompare(a.date));
    el.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Actual spending</div><h1>Transactions</h1><p class="page-sub">${escapeHtml(b.name)} · ${b.transactions.length} recorded</p></div><div class="actions"><button class="btn subtle-help" data-action="feature-help" data-id="transactions">Paano gamitin?</button><button class="btn primary" data-action="add-expense">＋ Add expense</button></div></div>
      <div class="card">
        <div class="search-row"><div class="grow"><input id="txSearch" value="${escapeHtml(state.transactionSearch)}" placeholder="Search description, category, or date…"></div><button class="btn" data-action="clear-tx-search">Clear</button></div>
        ${txs.length ? `<div class="list">${txs.map(t=>`
          <div class="list-item">
            <div class="list-main"><strong>${escapeHtml(t.description)}</strong><small>${dateText(t.date)} · ${escapeHtml(cats[t.categoryId]?.name || "Other")} · ${escapeHtml(t.paymentMethod||"Cash")}</small></div>
            <div class="actions"><span class="list-amount">${money(t.amount)}</span><button class="icon-mini" data-action="edit-transaction" data-id="${t.id}">✎</button><button class="icon-mini" data-action="delete-transaction" data-id="${t.id}">×</button></div>
          </div>`).join("")}</div>` : `<div class="empty"><strong>No matching transactions</strong>Try another search or add a new expense.</div>`}
      </div>`;
  }

  function renderSavings() {
    const el = document.getElementById("view-savings");
    const b = activeBudget();
    if (!b) { el.innerHTML = `<div class="empty card"><strong>Create a budget first</strong>Your savings goals will live inside a budget.</div>`; return; }
    const plannedSavings = b.categories.filter(c=>c.type==="savings").reduce((s,c)=>s+categoryPlanned(c),0);
    el.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Future you</div><h1>Savings</h1><p class="page-sub">Para madaling makita at ma-track yung mga ipon mo.</p></div><div class="actions"><button class="btn subtle-help" data-action="feature-help" data-id="savings">Paano gamitin?</button><button class="btn primary" data-action="add-goal">＋ Savings goal</button></div></div>
      <div class="grid grid-3">
        <div class="card metric"><span class="label">Planned this period</span><span class="value">${money(plannedSavings)}</span><span class="hint">From savings categories</span></div>
        <div class="card metric"><span class="label">Goals</span><span class="value">${b.savingsGoals.length}</span><span class="hint">Tracked in this budget</span></div>
        <div class="card metric"><span class="label">Saved toward goals</span><span class="value">${money(b.savingsGoals.reduce((s,g)=>s+num(g.saved),0))}</span><span class="hint">Current recorded progress</span></div>
      </div>
      <div class="grid grid-2 section">
        ${b.savingsGoals.length ? b.savingsGoals.map(g=>{
          const pct=Math.min(100,num(g.saved)/Math.max(1,num(g.target))*100);
          return `<div class="card goal-card">
            <div class="goal-top"><div><h2>${escapeHtml(g.name)}</h2><p class="page-sub">${escapeHtml(g.note||"")}</p></div><span class="goal-percent">${pct.toFixed(0)}%</span></div>
            <div class="progress"><span style="width:${pct}%"></span></div>
            <div class="detail-grid"><div class="detail-box"><small>Saved</small><strong>${money(g.saved)}</strong></div><div class="detail-box"><small>Target</small><strong>${money(g.target)}</strong></div></div>
            <div class="actions"><button class="btn small" data-action="edit-goal" data-id="${g.id}">Edit</button><button class="btn small danger" data-action="delete-goal" data-id="${g.id}">Delete</button></div>
          </div>`;
        }).join("") : `<div class="card empty cute-empty" style="grid-column:1/-1"><div class="empty-mascot">🐰</div><strong>Wala pang savings goal</strong><span>Gawa tayo kapag ready ka na. Kahit maliit muna, okay lang po.</span></div>`}
      </div>`;
  }

  function renderHistory() {
    const el = document.getElementById("view-history");
    const q = state.historySearch.toLowerCase();
    const budgets = [...state.data.budgets].filter(b=>`${b.name} ${b.startDate} ${b.endDate} ${b.notes}`.toLowerCase().includes(q)).sort((a,z)=>z.startDate.localeCompare(a.startDate));
    el.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Your records</div><h1>History</h1><p class="page-sub">Naka-save ang bawat budget kasama ang sariling dates nito.</p></div><div class="actions"><button class="btn subtle-help" data-action="feature-help" data-id="history">Paano gamitin?</button><button class="btn primary" data-action="new-budget">＋ New budget</button></div></div>
      <div class="card">
        <div class="search-row"><div class="grow"><input id="historySearch" value="${escapeHtml(state.historySearch)}" placeholder="Search budgets…"></div><button class="btn" data-action="clear-history-search">Clear</button></div>
        ${budgets.length ? `<div class="grid grid-2">${budgets.map(b=>{
          const s=budgetStats(b);
          return `<div class="card history-card" data-action="open-budget" data-id="${b.id}">
            <div class="history-top"><div><h2>${escapeHtml(b.name)}</h2><div class="history-date">${budgetPeriodLabel(b)}</div></div><span class="chip">${b.transactions.length} tx</span></div>
            <div style="margin-top:15px"><div class="history-amount">${money(b.income)}</div><div class="page-sub">available money</div></div>
            <div class="kpi-row" style="margin-top:10px"><span>Allocated</span><strong>${money(s.allocated)}</strong></div>
            <div class="kpi-row"><span>Remaining</span><strong class="${s.remaining<0?'bad':'good'}">${money(s.remaining)}</strong></div>
            <div class="actions" style="margin-top:12px"><button class="btn small" data-action="open-budget" data-id="${b.id}">Open</button><button class="btn small" data-action="duplicate-specific" data-id="${b.id}">Duplicate</button><button class="btn small danger" data-action="delete-budget" data-id="${b.id}">Delete</button></div>
          </div>`;
        }).join("")}</div>` : `<div class="empty cute-empty"><div class="empty-mascot">🐰</div><strong>Wala pang budget dito</strong><span>Gawa muna tayo ng first budget mo para may ma-save tayong record.</span></div>`}
      </div>`;
  }

  function renderSettings() {
    const el = document.getElementById("view-settings");
    el.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Preferences & data</div><h1>Settings</h1><p class="page-sub">Dito mo makikita ang settings at backup options.</p></div><button class="btn subtle-help" data-action="feature-help" data-id="settings">Paano gamitin?</button></div>
      <div class="grid grid-2">
        <div class="card">
          <h2>Appearance</h2><p class="page-sub" style="margin-bottom:16px">Choose how Budget Book looks on this device.</p>
          <div class="kpi-row"><span>Dark mode</span><button class="toggle ${state.settings.theme==="dark"?"on":""}" data-action="toggle-theme"><span></span></button></div>
          <div class="field" style="margin-top:15px"><label>Currency symbol</label><input id="currencySetting" maxlength="5" value="${escapeHtml(state.settings.currency)}"></div>
        </div>
        <div class="card">
          <h2>Backup</h2><p class="page-sub" style="margin-bottom:16px">Because this app is local, backups give you a safe copy you can move to another device.</p>
          <div class="actions"><button class="btn primary" data-action="export-json">Export JSON backup</button><button class="btn" data-action="import-json">Import backup</button><input id="importFile" type="file" accept=".json,application/json" hidden></div>
        </div>
        <div class="card">
          <h2>Spreadsheet export</h2><p class="page-sub" style="margin-bottom:16px">Export the current budget's transaction list as CSV for Excel or other spreadsheet apps.</p>
          <button class="btn" data-action="export-csv">Export transactions CSV</button>
        </div>
        <div class="card">
          <h2>Data</h2><p class="page-sub" style="margin-bottom:16px">Deleting all data cannot be undone unless you have a backup.</p>
          <button class="btn danger" data-action="clear-all">Delete all local data</button>
        </div>
      </div>
      <div class="card section">
        <div class="eyebrow">Made with care</div><h2>For Lablab, from Kenjie ♡</h2>
        <p class="page-sub">I made this for your everyday budgeting so you can plan, record, and review everything in one place.</p>
      </div>
      <div class="card section">
        <div class="eyebrow">About this app</div><h2>Private by design.</h2>
        <p class="page-sub">Budget Book uses browser storage. It does not send your budgeting records to a server, use analytics, or require an internet connection for normal budgeting.</p>
        <p class="page-sub">On GitHub Pages, the included service worker can cache the app for offline use after the first successful load.</p>
      </div>`;
  }

  function openModal({title, body, wide=false, onOpen=null}) {
    const root = document.getElementById("modalRoot");
    root.innerHTML = `<div class="modal-backdrop" data-modal-close><div class="modal ${wide?"wide":""}" role="dialog" aria-modal="true" tabindex="-1"><div class="modal-head"><div><h2>${escapeHtml(title)}</h2></div><button class="modal-close" data-modal-close aria-label="Close">×</button></div>${body}</div></div>`;
    document.body.classList.add("modal-open");
    // IMPORTANT: only the actual close button / close-marked element should close the modal.
    // Do not use closest() here because the backdrop itself has data-modal-close and
    // would otherwise be found from ANY input, textarea, select, or button inside the modal.
    root.querySelector(".modal").addEventListener("click", e=>{
      const closeTarget = e.target.closest("[data-modal-close]");
      if (closeTarget && closeTarget.closest(".modal") === e.currentTarget) {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }
      e.stopPropagation();
    });
    root.querySelector(".modal-backdrop").addEventListener("click", e=>{
      // Tapping the dimmed area closes the modal; tapping anything inside the dialog does not.
      if (e.target === e.currentTarget) closeModal();
    });
    if (onOpen) onOpen(root.querySelector(".modal"));
    root.querySelector(".modal")?.focus();
  }
  function closeModal(){ document.getElementById("modalRoot").innerHTML=""; document.body.classList.remove("modal-open"); }

  function modalBudget() {
    openModal({
      title:"Create a new budget",
      body:`<form id="newBudgetForm">
        <div class="form-grid">
          <div class="field full"><label>Budget name</label><input name="name" required value="New Budget" placeholder="e.g. August 15 Budget"></div>
          <div class="field"><label>Start date</label><input name="startDate" type="date" required value="${isoToday()}"></div>
          <div class="field"><label>End date</label><input name="endDate" type="date" required value="${addDays(isoToday(),14)}"></div>
          <div class="field full"><label>Available money</label><div class="input-prefix"><span>${escapeHtml(state.settings.currency)}</span><input name="income" type="text" inputmode="decimal" data-money-input required value="0"></div></div>
          <div class="field full"><label>Notes, optional lang</label><textarea name="notes" placeholder="May gusto kang tandaan para sa budget na ito"></textarea></div>
        </div>
        <div class="modal-foot"><button type="button" class="btn" data-modal-close>Cancel</button><button class="btn primary" type="submit">Create budget</button></div>
      </form>`
    });
    document.getElementById("newBudgetForm").addEventListener("submit", e=>{
      e.preventDefault();
      const f=new FormData(e.target);
      const b=newBudgetObject();
      b.name=String(f.get("name")).trim() || "New Budget";
      b.startDate=f.get("startDate"); b.endDate=f.get("endDate"); b.income=num(f.get("income")); b.notes=String(f.get("notes")||"");
      if (b.endDate < b.startDate) return toast("End date must be on or after the start date.");
      state.data.budgets.unshift(b); setActiveBudget(b.id); closeModal(); state.view="budget"; saveData(); renderAll(); toast("Budget created.");
    });
  }

  function addCategoryModal() {
    openModal({title:"Add category", body:`<form id="categoryForm">
      <div class="form-grid"><div class="field"><label>Category name</label><input name="name" required placeholder="e.g. Food"></div>
      <div class="field"><label>Type</label><select name="type"><option value="expense">Expense</option><option value="savings">Savings</option></select></div>
      <div class="field"><label>Days</label><input name="days" type="number" min="1" step="1" value="1"></div>
      <div class="field"><label>Amount / day</label><div class="input-prefix"><span>${escapeHtml(state.settings.currency)}</span><input name="amount" type="text" inputmode="decimal" data-money-input value="0"></div></div></div>
      <div class="modal-foot"><button type="button" class="btn" data-modal-close>Cancel</button><button class="btn primary">Add category</button></div>
    </form>`});
    document.getElementById("categoryForm").addEventListener("submit",e=>{
      e.preventDefault(); const b=getBudget(); const f=new FormData(e.target);
      b.categories.push({id:uid("cat"),name:String(f.get("name")).trim(),type:f.get("type"),days:num(f.get("days"))||1,amountPerDay:num(f.get("amount")),actualAmount:0});
      b.updatedAt=new Date().toISOString(); closeModal(); saveData(); renderAll(); toast("Category added.");
    });
  }

  function renameCategory(id) {
    const b=getBudget(); const c=b.categories.find(x=>x.id===id); if(!c)return;
    openModal({title:"Rename category", body:`<form id="renameForm"><div class="field"><label>Category name</label><input name="name" required value="${escapeHtml(c.name)}"></div><div class="modal-foot"><button type="button" class="btn" data-modal-close>Cancel</button><button class="btn primary">Save name</button></div></form>`});
    document.getElementById("renameForm").addEventListener("submit",e=>{e.preventDefault();c.name=new FormData(e.target).get("name").trim();b.updatedAt=new Date().toISOString();closeModal();saveData();renderAll();toast("Category renamed.");});
  }

  function addExpenseModal(existingId=null) {
    const b=activeBudget(); if(!b)return;
    const existing=existingId ? b.transactions.find(t=>t.id===existingId) : null;
    const cats=b.categories.filter(c=>c.type==="expense");
    if (!cats.length) return toast("Add an expense category first.");
    openModal({title:existing?"Edit transaction":"Add expense", body:`<form id="expenseForm">
      <div class="form-grid">
        <div class="field"><label>Date</label><input name="date" type="date" required value="${existing?.date||isoToday()}"></div>
        <div class="field"><label>Payment method</label><select name="paymentMethod">${["Cash","GCash","Bank Transfer","Debit / Card","Other"].map(m=>`<option ${((existing?.paymentMethod||"Cash")===m)?"selected":""}>${m}</option>`).join("")}</select></div>
        <div class="field"><label>Category</label><select name="categoryId">${cats.map(c=>`<option value="${c.id}" ${existing?.categoryId===c.id?"selected":""}>${escapeHtml(c.name)}</option>`).join("")}</select></div>
        <div class="field full"><label>Description</label><input name="description" required value="${escapeHtml(existing?.description||"")}" placeholder="e.g. Lunch, fare, bill"></div>
        <div class="field"><label>Amount</label><div class="input-prefix"><span>${escapeHtml(state.settings.currency)}</span><input name="amount" type="text" inputmode="decimal" data-money-input required value="${existing ? moneyInputValue(existing.amount) : ""}"></div></div>
        <div class="field"><label>Note</label><input name="note" value="${escapeHtml(existing?.note||"")}" placeholder="Optional"></div>
      </div>
      <div class="modal-foot"><button type="button" class="btn" data-modal-close>Cancel</button><button class="btn primary">${existing?"Save changes":"Add expense"}</button></div>
    </form>`});
    document.getElementById("expenseForm").addEventListener("submit",e=>{
      e.preventDefault(); const f=new FormData(e.target); const payload={date:f.get("date"),categoryId:f.get("categoryId"),description:String(f.get("description")).trim(),amount:num(f.get("amount")),paymentMethod:String(f.get("paymentMethod")||"Cash"),note:String(f.get("note")||"").trim()};
      if(existing) Object.assign(existing,payload); else b.transactions.push({id:uid("tx"),...payload});
      syncActuals(b); b.updatedAt=new Date().toISOString(); closeModal(); saveData(); renderAll(); toast(existing?"Transaction updated.":"Expense added.");
    });
  }

  function goalModal(existingId=null) {
    const b=activeBudget(); if(!b)return;
    const g=existingId ? b.savingsGoals.find(x=>x.id===existingId) : null;
    openModal({title:g?"Edit savings goal":"New savings goal", body:`<form id="goalForm">
      <div class="form-grid"><div class="field full"><label>Goal name</label><input name="name" required value="${escapeHtml(g?.name||"")} " placeholder="e.g. Emergency Fund"></div>
      <div class="field"><label>Target amount</label><div class="input-prefix"><span>${escapeHtml(state.settings.currency)}</span><input name="target" type="text" inputmode="decimal" data-money-input required value="${g ? moneyInputValue(g.target) : ""}"></div></div>
      <div class="field"><label>Saved so far</label><div class="input-prefix"><span>${escapeHtml(state.settings.currency)}</span><input name="saved" type="text" inputmode="decimal" data-money-input required value="${moneyInputValue(g?.saved??0)}"></div></div>
      <div class="field full"><label>Note</label><input name="note" value="${escapeHtml(g?.note||"")}" placeholder="Optional"></div></div>
      <div class="modal-foot"><button type="button" class="btn" data-modal-close>Cancel</button><button class="btn primary">${g?"Save goal":"Create goal"}</button></div>
    </form>`});
    document.getElementById("goalForm").addEventListener("submit",e=>{
      e.preventDefault(); const f=new FormData(e.target); const payload={name:String(f.get("name")).trim(),target:num(f.get("target")),saved:num(f.get("saved")),note:String(f.get("note")||"")};
      if(g) Object.assign(g,payload); else b.savingsGoals.push({id:uid("goal"),...payload});
      b.updatedAt=new Date().toISOString(); closeModal(); saveData(); renderAll(); toast(g?"Savings goal updated.":"Savings goal created.");
    });
  }

  function toast(message) {
    const root=document.getElementById("toastRoot"); const el=document.createElement("div"); el.className="toast"; el.textContent=message; root.appendChild(el);
    setTimeout(()=>el.remove(),2600);
  }

  function confirmAction(message) { return window.confirm(message); }

  function printBudget() {
    const b=activeBudget(); if(!b)return;
    syncActuals(b); const s=budgetStats(b);
    const rows=b.categories.map(c=>`<tr><td>${escapeHtml(c.name)}</td><td class="num">${num(c.days)}</td><td class="num">${money(c.amountPerDay)}</td><td class="num">${money(categoryPlanned(c))}</td><td class="num">${money(c.actualAmount)}</td><td class="num">${money(categoryPlanned(c)-num(c.actualAmount))}</td></tr>`).join("");
    document.getElementById("printArea").innerHTML=`<div class="print-doc">
      <div class="print-head"><div><h1>Personal Budget</h1><div class="print-muted">${escapeHtml(b.name)}</div></div><div style="text-align:right"><strong>${dateText(b.startDate)} hanggang ${dateText(b.endDate)}</strong><div class="print-muted">Printed ${dateText(isoToday())}</div></div></div>
      <div class="print-summary"><div><small>Available</small><strong>${money(b.income)}</strong></div><div><small>Planned expenses</small><strong>${money(s.plannedExpense)}</strong></div><div><small>Planned savings</small><strong>${money(s.plannedSavings)}</strong></div><div><small>Remaining</small><strong>${money(s.remaining)}</strong></div></div>
      <table class="print-table"><thead><tr><th>Category</th><th>Days</th><th>Amount / Day</th><th>Planned Total</th><th>Actual</th><th>Difference</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="print-totals"><div><span>Total allocated</span><strong>${money(s.allocated)}</strong></div><div><span>Actual spending</span><strong>${money(s.actual)}</strong></div><div><span>Expected after actuals</span><strong>${money(s.actualRemaining)}</strong></div><div><span>Actual cash on hand</span><strong>${money(b.actualCash||0)}</strong></div><div><span>Cash variance</span><strong>${money(num(b.actualCash)-s.actualRemaining)}</strong></div></div>
      <div class="print-notes"><strong>Notes</strong><pre>${escapeHtml(b.notes||"No notes.")}</pre></div>
    </div>`;
    window.print();
    toast("Print preview opened.");
  }

  function download(filename, content, type="application/octet-stream") {
    const blob=new Blob([content],{type}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
  }

  function exportJSON() {
    const payload={app:"Budget Book",version:1,exportedAt:new Date().toISOString(),data:state.data,settings:state.settings};
    download(`budget-book-backup-${isoToday()}.json`,JSON.stringify(payload,null,2),"application/json");
    toast("Backup exported.");
  }

  function exportCSV() {
    const b=activeBudget(); if(!b)return toast("Create a budget first.");
    const cats=Object.fromEntries(b.categories.map(c=>[c.id,c.name]));
    const lines=[["Date","Category","Description","Payment Method","Amount","Note"],...b.transactions.map(t=>[t.date,cats[t.categoryId]||"Other",t.description,t.paymentMethod||"Cash",num(t.amount),t.note||""])];
    const csv=lines.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    download(`${b.name.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-transactions.csv`,csv,"text/csv;charset=utf-8");
    toast("CSV exported.");
  }

  function importJSON() {
    const input=document.getElementById("importFile"); input.value=""; input.click();
    input.onchange=async()=>{const file=input.files?.[0]; if(!file)return; try {
      const parsed=JSON.parse(await file.text()); const incoming=parsed.data || parsed;
      if(!Array.isArray(incoming.budgets)) throw new Error("Invalid backup");
      if(!confirmAction("Importing this backup will replace the budgets currently stored on this device. Continue?")) return;
      state.data=incoming; state.settings={...state.settings,...(parsed.settings||{})}; state.currentBudgetId=state.data.activeBudgetId || state.data.budgets[0]?.id || null;
      saveData(); renderAll(); toast("Backup imported.");
    } catch { toast("That file is not a valid Budget Book backup."); }};
  }

  function deleteAll() {
    if(!confirmAction("Delete every local budget, transaction, goal, and note? This cannot be undone without a backup.")) return;
    localStorage.removeItem(STORAGE_KEY); state.data={budgets:[],activeBudgetId:null}; state.currentBudgetId=null; saveData(); state.view="dashboard"; renderAll(); toast("All local data deleted.");
  }

  document.addEventListener("click", e => {
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menuBtn");
    if (window.matchMedia && window.matchMedia("(max-width: 820px)").matches && sidebar?.classList.contains("open") && !e.target.closest("#sidebar") && !e.target.closest("#menuBtn")) {
      sidebar.classList.remove("open");
    }
    const nav=e.target.closest("[data-view]");
    if(nav) { navigate(nav.dataset.view); return; }
    const action=e.target.closest("[data-action]");
    if(!action)return;
    const a=action.dataset.action, id=action.dataset.id;
    switch(a) {
      case "tutorial": openTutorial(state.view); break;
      case "tutorial-section": openTutorial(id); break;
      case "feature-help": featureHelp(id); break;
      case "new-budget": modalBudget(); break;
      case "sample-budget": {
        const b=newBudgetObject({sample:true}); state.data.budgets.unshift(b); setActiveBudget(b.id); state.view="dashboard"; saveData(); renderAll(); toast("Sample budget added.");
        break;
      }
      case "go-budget": state.currentBudgetId=activeBudget()?.id||null; navigate("budget"); break;
      case "go-transactions": navigate("transactions"); break;
      case "go-savings": navigate("savings"); break;
      case "add-category": addCategoryModal(); break;
      case "rename-category": renameCategory(id); break;
      case "delete-category": {
        const b=getBudget(); if(!b)return;
        if(!confirmAction("Delete this category? Existing transactions under it will remain but appear as Other."))break;
        b.categories=b.categories.filter(c=>c.id!==id); b.updatedAt=new Date().toISOString(); saveData(); renderAll(); toast("Category deleted.");
        break;
      }
      case "add-expense": addExpenseModal(); break;
      case "edit-transaction": addExpenseModal(id); break;
      case "delete-transaction": {
        const b=activeBudget(); if(!confirmAction("Delete this transaction?"))break;
        b.transactions=b.transactions.filter(t=>t.id!==id); syncActuals(b); b.updatedAt=new Date().toISOString(); saveData(); renderAll(); toast("Transaction deleted.");
        break;
      }
      case "add-goal": goalModal(); break;
      case "edit-goal": goalModal(id); break;
      case "delete-goal": {
        const b=activeBudget(); if(!confirmAction("Delete this savings goal?"))break;
        b.savingsGoals=b.savingsGoals.filter(g=>g.id!==id); b.updatedAt=new Date().toISOString(); saveData(); renderAll(); toast("Savings goal deleted.");
        break;
      }
      case "open-budget": {
        setActiveBudget(id); state.view="budget"; renderAll(); break;
      }
      case "duplicate-budget": {
        const source=getBudget(); if(!source)return;
        const b=newBudgetObject({source}); b.name=`${source.name} Copy`; b.startDate=isoToday();
        b.endDate=addDays(b.startDate, 14); b.income=source.income; b.notes=source.notes;
        state.data.budgets.unshift(b); setActiveBudget(b.id); saveData(); renderAll(); toast("Budget duplicated.");
        break;
      }
      case "duplicate-specific": {
        const source=getBudget(id); if(!source)return;
        const b=newBudgetObject({source}); b.name=`${source.name} Copy`; b.startDate=isoToday(); b.endDate=addDays(b.startDate, 14); b.income=source.income; b.notes=source.notes;
        state.data.budgets.unshift(b); setActiveBudget(b.id); state.view="budget"; saveData(); renderAll(); toast("Budget duplicated.");
        break;
      }
      case "delete-budget": {
        if(!confirmAction("Delete this entire budget and its transactions?"))break;
        state.data.budgets=state.data.budgets.filter(b=>b.id!==id);
        if(state.data.activeBudgetId===id) state.data.activeBudgetId=state.data.budgets[0]?.id||null;
        state.currentBudgetId=state.data.activeBudgetId; saveData(); renderAll(); toast("Budget deleted.");
        break;
      }
      case "print-budget": printBudget(); break;
      case "save-now": {
        const b=getBudget(); if(b){b.updatedAt=new Date().toISOString();saveData();toast("Saved na po, Lablab ♡");}
        break;
      }
      case "toggle-theme":
        state.settings.theme=state.settings.theme==="dark"?"light":"dark"; applyTheme(); saveData(); renderAll(); break;
      case "export-json": exportJSON(); break;
      case "import-json": importJSON(); break;
      case "export-csv": exportCSV(); break;
      case "clear-all": deleteAll(); break;
      case "clear-tx-search": state.transactionSearch=""; renderTransactions(); break;
      case "clear-history-search": state.historySearch=""; renderHistory(); break;
    }
  });

  document.addEventListener("input", e => {
    if(e.target.id==="txSearch"){state.transactionSearch=e.target.value;renderTransactions();const el=document.getElementById("txSearch");el?.focus();el?.setSelectionRange(el.value.length,el.value.length);return;}
    if(e.target.id==="historySearch"){state.historySearch=e.target.value;renderHistory();const el=document.getElementById("historySearch");el?.focus();el?.setSelectionRange(el.value.length,el.value.length);return;}
    if(e.target.id==="currencySetting"){
      state.settings.currency=e.target.value || "₱"; saveData(); renderAll(); return;
    }
    if(e.target.id==="budgetNotes"){
      const b=getBudget(); if(b){b.notes=e.target.value;b.updatedAt=new Date().toISOString();saveData();}
      return;
    }
  });

  document.addEventListener("change", e => {
    if(e.target.id==="actualCashInput"){
      const b=getBudget();
      if(b){ b.actualCash=Math.max(0,num(e.target.value)); b.updatedAt=new Date().toISOString(); saveData(); renderBudget(); toast("Actual cash updated."); }
      return;
    }
    const field=e.target.dataset?.field, catId=e.target.dataset?.cat;
    if(field && catId){
      const b=getBudget(), c=b?.categories.find(x=>x.id===catId); if(!c)return;
      c[field]=field==="days" ? Math.max(1, Math.floor(num(e.target.value))) : Math.max(0,num(e.target.value));
      b.updatedAt=new Date().toISOString(); saveData(); renderBudget();
    }
  });

  function applyTheme(){ document.documentElement.dataset.theme=state.settings.theme==="dark"?"dark":"light"; }
  document.getElementById("themeBtn").addEventListener("click",()=>{state.settings.theme=state.settings.theme==="dark"?"light":"dark";applyTheme();saveData();});
  document.getElementById("menuBtn").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));

  window.addEventListener("keydown", e => {
    if(e.key==="Escape") closeModal();
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="p"){e.preventDefault(); if(activeBudget())printBudget();}
  });

  // First run: create a gentle empty state; no fake personal data.
  state.currentBudgetId=state.data.activeBudgetId || state.data.budgets[0]?.id || null;
  applyTheme();
  renderAll();

  if (!state.settings.tutorialSeen) {
    setTimeout(() => { openTutorial("dashboard"); state.settings.tutorialSeen = true; saveData(); }, 500);
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("service-worker.js").catch(()=>{});
  }
})();