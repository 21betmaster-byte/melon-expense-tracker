/** CSS-rendered phone mockups showing real app screens. */

/* ── Tiny category icon ───────────────────────────────────────── */
function CatIcon({ type }: { type: "food" | "housing" | "transport" | "shopping" | "entertainment" | "health" | "tag" | "settlement" }) {
  const map: Record<string, { bg: string; color: string; d: string }> = {
    food:          { bg: "bg-orange-900/40", color: "text-orange-400", d: "M3 3h18v2H3zm0 4h18v14H3zm4 4h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" },
    housing:       { bg: "bg-yellow-900/40", color: "text-yellow-400", d: "M3 12l9-8 9 8v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
    transport:     { bg: "bg-blue-900/40",   color: "text-blue-400",   d: "M5 17h14M5 17a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2M5 17l-1 3m15-3l1 3M8 14h.01M16 14h.01" },
    shopping:      { bg: "bg-purple-900/40", color: "text-purple-400", d: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4z" },
    entertainment: { bg: "bg-pink-900/40",   color: "text-pink-400",   d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
    health:        { bg: "bg-green-900/40",  color: "text-green-400",  d: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    tag:           { bg: "bg-slate-700/40",  color: "text-slate-400",  d: "M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" },
    settlement:    { bg: "bg-emerald-900/40", color: "text-emerald-400", d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  };
  const cfg = map[type] ?? map.tag;
  return (
    <div className={`w-5 h-5 rounded-md ${cfg.bg} flex items-center justify-center shrink-0`}>
      <svg className={`w-2.5 h-2.5 ${cfg.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cfg.d} />
      </svg>
    </div>
  );
}

/* ── Bottom Nav (matches real AppNav) ────────────────────────── */
function BottomNav({ active = "home" }: { active?: "home" | "expenses" | "analytics" | "settings" }) {
  return (
    <div className="flex items-end justify-around px-1 pt-1.5 pb-1 border-t border-slate-800/60 mt-auto shrink-0">
      {/* Dashboard */}
      <div className="flex flex-col items-center gap-0.5">
        <svg className={`w-4 h-4 ${active === "home" ? "text-blue-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.5} /><rect x="14" y="3" width="7" height="4" rx="1" strokeWidth={1.5} /><rect x="14" y="10" width="7" height="11" rx="1" strokeWidth={1.5} /><rect x="3" y="13" width="7" height="8" rx="1" strokeWidth={1.5} /></svg>
        <span className={`text-[6px] ${active === "home" ? "text-blue-400 font-medium" : "text-slate-500"}`}>Dashboard</span>
      </div>
      {/* Expenses */}
      <div className="flex flex-col items-center gap-0.5">
        <svg className={`w-4 h-4 ${active === "expenses" ? "text-blue-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        <span className={`text-[6px] ${active === "expenses" ? "text-blue-400 font-medium" : "text-slate-500"}`}>Expenses</span>
      </div>
      {/* Center FAB */}
      <div className="flex flex-col items-center -mt-3">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </div>
      </div>
      {/* Analytics */}
      <div className="flex flex-col items-center gap-0.5">
        <svg className={`w-4 h-4 ${active === "analytics" ? "text-blue-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        <span className={`text-[6px] ${active === "analytics" ? "text-blue-400 font-medium" : "text-slate-500"}`}>Analytics</span>
      </div>
      {/* Settings */}
      <div className="flex flex-col items-center gap-0.5">
        <svg className={`w-4 h-4 ${active === "settings" ? "text-blue-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <span className={`text-[6px] ${active === "settings" ? "text-blue-400 font-medium" : "text-slate-500"}`}>Settings</span>
      </div>
    </div>
  );
}

/* ── Top Bar (matches real AppNav header) ────────────────────── */
function TopBar({ groupName = "Day to Day" }: { groupName?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-blue-400">Melon</span>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800">
          <span className="text-[8px] text-slate-300">{groupName}</span>
          <svg className="w-2 h-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
        <span className="text-[8px] font-semibold text-white">S</span>
      </div>
    </div>
  );
}

/* ── Phone Frame (no notch / dynamic island) ──────────────────── */
function PhoneFrame({ children, className = "", nav }: { children: React.ReactNode; className?: string; nav?: React.ReactNode }) {
  return (
    <div className={`relative mx-auto w-[260px] h-[565px] md:w-[260px] md:h-[565px] lg:w-[300px] lg:h-[650px] ${className}`}>
      {/* Phone bezel */}
      <div className="relative h-full rounded-[3rem] border-[8px] border-slate-700 bg-slate-950 shadow-2xl shadow-blue-500/10 overflow-hidden flex flex-col">
        {/* Screen content */}
        <div className="pt-4 px-3 flex-1 overflow-hidden flex flex-col relative">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
          {/* Subtle scroll indicator */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>
        {/* Bottom nav */}
        {nav && <div className="px-2 pb-4">{nav}</div>}
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-28 rounded-full bg-slate-600" />
      </div>
    </div>
  );
}

/* ── Dashboard Preview ─────────────────────────────────────────── */
export function DashboardPreview() {
  return (
    <PhoneFrame nav={<BottomNav active="home" />}>
      <TopBar />

      {/* Group heading + Add button */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-semibold text-slate-100">Day to Day Expenses</h3>
        <div className="h-5 px-2 rounded-md bg-blue-600 flex items-center gap-1">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          <span className="text-[8px] font-medium text-white">Add</span>
        </div>
      </div>

      {/* Settlement card with Mark as Settled + History */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 mb-2">
        <p className="text-[8px] text-slate-400 uppercase tracking-wide mb-1">Settlement</p>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-medium text-slate-300">You</span>
          <svg className="w-2.5 h-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          <span className="text-[10px] font-medium text-slate-300">Alex</span>
        </div>
        <p className="text-lg font-bold text-blue-400">$245.50</p>
        <p className="text-[8px] text-slate-400 mt-0.5">You owe Alex</p>
        {/* Mark as Settled button */}
        <div className="mt-1.5 h-5 w-fit px-2 rounded-md border border-slate-700 bg-slate-800 flex items-center gap-1">
          <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-[7px] text-slate-300">Mark as Settled</span>
        </div>
        {/* Settlement History */}
        <div className="mt-2 pt-1.5 border-t border-slate-800">
          <p className="text-[7px] text-slate-500 uppercase tracking-wide mb-1">Settlement History</p>
          {[
            { amount: "$320.00", date: "11 Mar 2026" },
            { amount: "$185.50", date: "28 Feb 2026" },
          ].map((s) => (
            <div key={s.date} className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] text-slate-400">Alex → You</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-medium text-emerald-400">{s.amount}</span>
                <span className="text-[7px] text-slate-500">{s.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        {[
          { label: "This Month", value: "$1,280" },
          { label: "Joint", value: "$890" },
          { label: "Transactions", value: "23" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/80 p-1.5 text-center">
            <p className="text-[7px] text-slate-400">{label}</p>
            <p className="text-[10px] font-semibold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent expenses header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wide">Recent</p>
        <span className="text-[8px] text-blue-400">View all</span>
      </div>

      {/* Expense list with category icons + badges */}
      {[
        { desc: "Whole Foods", amount: "$85.40", cat: "Groceries", icon: "food" as const, badge: "Joint", badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        { desc: "Electricity Bill", amount: "$142.00", cat: "Housing & Utilities", icon: "housing" as const, badge: "Joint", badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        { desc: "Date Night", amount: "$67.50", cat: "Food & Dining", icon: "food" as const, badge: "Solo", badgeColor: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
        { desc: "Coffee Run", amount: "$12.80", cat: "Food & Dining", icon: "food" as const, badge: "Solo", badgeColor: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
        { desc: "Internet Bill", amount: "$79.99", cat: "Housing & Utilities", icon: "housing" as const, badge: "Joint", badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        { desc: "Uber to Airport", amount: "$34.00", cat: "Transportation", icon: "transport" as const, badge: "Paid for Partner", badgeColor: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
        { desc: "Pharmacy", amount: "$22.15", cat: "Health & Wellness", icon: "health" as const, badge: "Joint", badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
      ].map((e) => (
        <div key={e.desc} className="rounded-md border border-slate-800 bg-slate-900/60 p-1.5 mb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <CatIcon type={e.icon} />
              <div className="min-w-0">
                <p className="text-[9px] text-slate-200 truncate">{e.desc}</p>
                <div className="flex items-center gap-1 mt-px">
                  <span className="text-[7px] text-blue-400">{e.cat}</span>
                  <span className={`text-[6px] px-1 py-px rounded border ${e.badgeColor}`}>{e.badge}</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] font-medium text-slate-100 shrink-0">{e.amount}</p>
          </div>
        </div>
      ))}
    </PhoneFrame>
  );
}

/* ── Analytics Preview ─────────────────────────────────────────── */
export function AnalyticsPreview() {
  return (
    <PhoneFrame nav={<BottomNav active="analytics" />}>
      <TopBar />

      {/* Header with time period filter */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-slate-100">Analytics — Day to Day</h3>
        <div className="h-5 px-1.5 rounded border border-slate-700 bg-slate-800 flex items-center">
          <span className="text-[8px] text-slate-300">6 months ▾</span>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-1 flex-wrap mb-2">
        {["Food & Dining", "Housing", "Transport", "Entertainment", "Health", "Shopping"].map((c) => (
          <span key={c} className="text-[6px] px-1.5 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-400">{c}</span>
        ))}
      </div>

      {/* Insights card */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2 mb-2">
        <p className="text-[8px] text-blue-400 font-medium mb-0.5">Spending Insights</p>
        <p className="text-[7px] text-slate-300 leading-relaxed">
          — Housing is your top category at $890 across 4 transactions (avg $222)
        </p>
        <p className="text-[7px] text-slate-300 leading-relaxed">
          — Spending is down 12% from last month. Keep it up!
        </p>
      </div>

      {/* MoM Trend chart header with dropdowns */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[7px] font-medium text-slate-400 uppercase tracking-wide">Total Expenses — MoM</p>
        <div className="flex gap-1">
          <span className="text-[6px] px-1 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-400">All Categories ▾</span>
          <span className="text-[6px] px-1 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-400">Bar ▾</span>
        </div>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 mb-2">
        {/* Y-axis labels + bars */}
        <div className="flex gap-1">
          {/* Y-axis */}
          <div className="flex flex-col justify-between h-16 pr-0.5">
            <span className="text-[5px] text-slate-600">$2k</span>
            <span className="text-[5px] text-slate-600">$1.5k</span>
            <span className="text-[5px] text-slate-600">$1k</span>
            <span className="text-[5px] text-slate-600">$500</span>
            <span className="text-[5px] text-slate-600">$0</span>
          </div>
          {/* Bars */}
          <div className="flex-1 flex items-end gap-1 h-16">
            {[
              { h: 30, label: "Oct" },
              { h: 42, label: "Nov" },
              { h: 36, label: "Dec" },
              { h: 52, label: "Jan" },
              { h: 46, label: "Feb" },
              { h: 40, label: "Mar" },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400"
                  style={{ height: `${bar.h}px` }}
                />
                <span className="text-[6px] text-slate-500 mt-0.5">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex justify-center mt-1">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-sm bg-blue-500" />
            <span className="text-[6px] text-slate-400">Total</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown pie */}
      <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wide mb-1">Category Breakdown</p>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 mb-2">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 36 36" className="w-12 h-12 shrink-0">
            <circle cx="18" cy="18" r="15.92" fill="none" stroke="#3b82f6" strokeWidth="5" strokeDasharray="34 66" strokeDashoffset="25" />
            <circle cx="18" cy="18" r="15.92" fill="none" stroke="#8b5cf6" strokeWidth="5" strokeDasharray="24 76" strokeDashoffset="91" />
            <circle cx="18" cy="18" r="15.92" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray="22 78" strokeDashoffset="67" />
            <circle cx="18" cy="18" r="15.92" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="20 80" strokeDashoffset="45" />
          </svg>
          <div className="space-y-0.5">
            {[
              { label: "Housing & Utilities", pct: "34%", color: "bg-blue-500" },
              { label: "Food & Dining", pct: "28%", color: "bg-purple-500" },
              { label: "Transportation", pct: "22%", color: "bg-green-500" },
              { label: "Shopping", pct: "16%", color: "bg-yellow-500" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${c.color}`} />
                <span className="text-[7px] text-slate-300">{c.label}</span>
                <span className="text-[7px] text-slate-500">{c.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Who Paid What */}
      <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wide mb-1">Who Paid What</p>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] text-slate-300">You</span>
          <span className="text-[9px] font-semibold text-slate-100">$1,840</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 mb-2 overflow-hidden">
          <div className="h-full w-[65%] rounded-full bg-blue-500" />
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] text-slate-300">Alex</span>
          <span className="text-[9px] font-semibold text-slate-100">$980</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full w-[35%] rounded-full bg-purple-500" />
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ── Expenses Preview ──────────────────────────────────────────── */
export function ExpensesPreview() {
  return (
    <PhoneFrame nav={<BottomNav active="expenses" />}>
      <TopBar />

      {/* Header with Export CSV + Add */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-[12px] font-semibold text-slate-100">All Expenses</h3>
          <p className="text-[7px] text-slate-500">Day to Day Expenses · 23 transactions</p>
        </div>
        <div className="flex gap-1">
          <div className="h-5 px-1.5 rounded-md border border-slate-700 bg-slate-800 flex items-center gap-0.5">
            <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span className="text-[7px] text-slate-300">CSV</span>
          </div>
          <div className="h-5 px-2 rounded-md bg-blue-600 flex items-center gap-0.5">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            <span className="text-[8px] font-medium text-white">Add</span>
          </div>
        </div>
      </div>

      {/* All / Recurring tabs */}
      <div className="flex gap-0 mb-2">
        <div className="h-5 px-3 rounded-l-md bg-slate-800 border border-slate-700 flex items-center justify-center border-b-2 border-b-blue-500">
          <span className="text-[8px] font-medium text-blue-400">All</span>
        </div>
        <div className="h-5 px-3 rounded-r-md bg-slate-900 border border-slate-700 flex items-center justify-center">
          <span className="text-[8px] text-slate-400">Recurring</span>
        </div>
      </div>

      {/* 3-col summary cards: Total Spent, This Month, Top Category */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-1.5">
          <p className="text-[6px] text-slate-500">Total Spent</p>
          <p className="text-[10px] font-semibold text-slate-100">$2,485</p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-1.5">
          <p className="text-[6px] text-slate-500">This Month</p>
          <p className="text-[10px] font-semibold text-slate-100">$1,280</p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-1.5">
          <p className="text-[6px] text-slate-500">Top Category</p>
          <p className="text-[9px] font-semibold text-slate-100">Housing</p>
          <p className="text-[6px] text-slate-500">$890</p>
        </div>
      </div>

      {/* Month filter + Filters button */}
      <div className="flex gap-1 mb-1.5">
        <div className="flex-1 h-5 rounded border border-slate-700 bg-slate-800 flex items-center px-1.5">
          <span className="text-[7px] text-slate-400">All Months ▾</span>
        </div>
        <div className="h-5 px-1.5 rounded border border-slate-700 bg-slate-800 flex items-center gap-0.5">
          <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          <span className="text-[7px] text-slate-300">Filters</span>
        </div>
      </div>

      {/* Search bar + Sort */}
      <div className="flex gap-1 mb-2">
        <div className="flex-1 relative">
          <svg className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <div className="h-5 rounded border border-slate-700 bg-slate-900 pl-5 flex items-center">
            <span className="text-[7px] text-slate-500">Search expenses...</span>
          </div>
        </div>
        <div className="h-5 px-1.5 rounded border border-slate-700 bg-slate-800 flex items-center">
          <span className="text-[7px] text-slate-400">Date (Newest) ▾</span>
        </div>
      </div>

      {/* Date group header */}
      <p className="text-[7px] text-slate-500 mb-1">19 Mar 2026</p>

      {/* Expense list with category icons + badges */}
      {[
        { desc: "Whole Foods", amount: "$127.35", cat: "Groceries", icon: "food" as const, badge: "Joint", badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        { desc: "Netflix", amount: "$15.99", cat: "Entertainment", icon: "entertainment" as const, badge: "Solo", badgeColor: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
        { desc: "Uber", amount: "$24.50", cat: "Transportation", icon: "transport" as const, badge: "Joint", badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        { desc: "Gym Membership", amount: "$49.00", cat: "Health & Wellness", icon: "health" as const, badge: "Solo", badgeColor: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
        { desc: "Dinner Out", amount: "$88.20", cat: "Food & Dining", icon: "food" as const, badge: "Joint", badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        { desc: "Electric Bill", amount: "$142.00", cat: "Housing & Utilities", icon: "housing" as const, badge: "Paid for Partner", badgeColor: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
        { desc: "Gas Station", amount: "$45.60", cat: "Transportation", icon: "transport" as const, badge: "Joint", badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
      ].map((e) => (
        <div key={e.desc} className="rounded-md border border-slate-800 bg-slate-900/60 p-1.5 mb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <CatIcon type={e.icon} />
              <div className="min-w-0">
                <p className="text-[9px] text-slate-200 truncate">{e.desc}</p>
                <div className="flex items-center gap-1 mt-px">
                  <span className="text-[7px] text-blue-400">{e.cat}</span>
                  <span className={`text-[6px] px-1 py-px rounded border ${e.badgeColor}`}>{e.badge}</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] font-medium text-slate-100 shrink-0">{e.amount}</p>
          </div>
        </div>
      ))}
    </PhoneFrame>
  );
}

/* ── Split Preview (for feature showcase) ──────────────────────── */
export function SplitPreview() {
  return (
    <PhoneFrame nav={<BottomNav active="expenses" />}>
      <TopBar />

      {/* Header */}
      <div className="mb-2">
        <h3 className="text-[12px] font-semibold text-slate-100 mb-0.5">Add Expense</h3>
      </div>

      {/* Quick-add chips */}
      <div className="flex flex-wrap gap-1 mb-2">
        {["85 Whole Foods", "142 Electricity", "68 Date Night"].map((chip) => (
          <span key={chip} className="text-[7px] px-1.5 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-400">{chip}</span>
        ))}
      </div>

      {/* Expense form */}
      <div className="space-y-2">
        {/* Description */}
        <div>
          <p className="text-[7px] text-slate-400 mb-0.5 font-medium">Description</p>
          <div className="h-6 rounded-md border border-slate-700 bg-slate-800 flex items-center px-2">
            <span className="text-[9px] text-slate-200">Weekly Groceries</span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <p className="text-[7px] text-slate-400 mb-0.5 font-medium">Amount</p>
          <div className="h-6 rounded-md border border-slate-700 bg-slate-800 flex items-center px-2">
            <span className="text-[9px] text-slate-200">$156.80</span>
          </div>
        </div>

        {/* Date */}
        <div>
          <p className="text-[7px] text-slate-400 mb-0.5 font-medium">Date</p>
          <div className="h-6 rounded-md border border-slate-700 bg-slate-800 flex items-center px-2 justify-between">
            <span className="text-[9px] text-slate-200">Mar 19, 2026</span>
            <svg className="w-2.5 h-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        </div>

        {/* Type pills */}
        <div>
          <p className="text-[7px] text-slate-400 mb-0.5 font-medium">Type</p>
          <div className="flex gap-1 flex-wrap">
            {["Joint", "Solo", "Paid for Partner"].map((t, i) => (
              <span
                key={t}
                className={`text-[7px] px-1.5 py-0.5 rounded-full ${i === 0 ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" : "bg-slate-800 text-slate-400 border border-slate-700"}`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div>
          <p className="text-[7px] text-slate-400 mb-0.5 font-medium">Category</p>
          <div className="flex gap-1 flex-wrap">
            {["Food", "Bills", "Transport", "Fun", "Health"].map((c, i) => (
              <span
                key={c}
                className={`text-[7px] px-1.5 py-0.5 rounded-full ${i === 0 ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" : "bg-slate-800 text-slate-400 border border-slate-700"}`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Split Ratio */}
        <div>
          <p className="text-[7px] text-slate-400 mb-0.5 font-medium">Split Ratio</p>
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-slate-700 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-[60%] rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow" style={{ left: "calc(60% - 6px)" }} />
            </div>
            <div className="flex justify-between">
              <div>
                <p className="text-[8px] font-medium text-blue-400">You: 60%</p>
                <p className="text-[7px] text-slate-500">$94.08</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-medium text-purple-400">Alex: 40%</p>
                <p className="text-[7px] text-slate-500">$62.72</p>
              </div>
            </div>
          </div>
        </div>

        {/* Paid By */}
        <div>
          <p className="text-[7px] text-slate-400 mb-0.5 font-medium">Paid By</p>
          <div className="flex gap-1.5">
            <div className="flex-1 h-6 rounded-md border border-blue-500/40 bg-blue-500/10 flex items-center justify-center">
              <span className="text-[8px] font-medium text-blue-300">You</span>
            </div>
            <div className="flex-1 h-6 rounded-md border border-slate-700 bg-slate-800 flex items-center justify-center">
              <span className="text-[8px] text-slate-400">Alex</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-[7px] text-slate-400 mb-0.5 font-medium">Notes <span className="text-slate-600">(optional)</span></p>
          <div className="h-6 rounded-md border border-slate-700 bg-slate-800 flex items-center px-2">
            <span className="text-[9px] text-slate-500">Trader Joe&apos;s weekly run</span>
          </div>
        </div>

        {/* Recurring toggle */}
        <div className="flex items-center justify-between py-0.5">
          <div className="flex items-center gap-1">
            <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span className="text-[8px] text-slate-300">Recurring</span>
          </div>
          <div className="w-6 h-3.5 rounded-full bg-slate-700 relative">
            <div className="absolute left-0.5 top-0.5 w-2.5 h-2.5 rounded-full bg-slate-400" />
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="mt-2 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
        <span className="text-[10px] font-semibold text-white">Add Expense</span>
      </div>
    </PhoneFrame>
  );
}
