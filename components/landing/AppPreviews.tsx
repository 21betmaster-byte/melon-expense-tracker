/** CSS-rendered phone mockups showing real app screens. */

/* ── Phone Frame ───────────────────────────────────────────────── */
function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto ${className}`}>
      {/* Phone bezel */}
      <div className="relative rounded-[2.5rem] border-[6px] border-slate-700 bg-slate-950 shadow-2xl shadow-blue-500/10 overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-28 rounded-b-2xl bg-slate-700 z-10" />
        {/* Screen content */}
        <div className="pt-8 pb-4 px-4 min-h-[420px] max-h-[520px] overflow-hidden">
          {children}
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-28 rounded-full bg-slate-600" />
      </div>
    </div>
  );
}

/* ── Dashboard Preview ─────────────────────────────────────────── */
export function DashboardPreview() {
  return (
    <PhoneFrame className="w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-100">Household</h3>
        <div className="h-7 w-14 rounded-md bg-blue-600 flex items-center justify-center">
          <span className="text-[10px] font-medium text-white">+ Add</span>
        </div>
      </div>

      {/* Settlement card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 mb-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Settlement</p>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-slate-300">You</span>
          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          <span className="text-xs font-medium text-slate-300">Alex</span>
        </div>
        <p className="text-2xl font-bold text-blue-400">$245.50</p>
        <p className="text-[10px] text-slate-400 mt-0.5">You owe Alex</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "This Month", value: "$1,280" },
          { label: "Joint", value: "$890" },
          { label: "Transactions", value: "23" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-center">
            <p className="text-[9px] text-slate-400">{label}</p>
            <p className="text-[11px] font-semibold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent expenses */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Recent</p>
        <span className="text-[10px] text-blue-400">View all</span>
      </div>
      {[
        { desc: "Groceries", amount: "$85.40", cat: "Food", who: "You", color: "bg-green-500/20 text-green-400" },
        { desc: "Electricity Bill", amount: "$142.00", cat: "Bills", who: "Alex", color: "bg-yellow-500/20 text-yellow-400" },
        { desc: "Date Night", amount: "$67.50", cat: "Fun", who: "You", color: "bg-purple-500/20 text-purple-400" },
      ].map((e) => (
        <div key={e.desc} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${e.color}`}>{e.cat}</span>
            <div>
              <p className="text-xs text-slate-200">{e.desc}</p>
              <p className="text-[9px] text-slate-500">{e.who}</p>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-100">{e.amount}</p>
        </div>
      ))}
    </PhoneFrame>
  );
}

/* ── Analytics Preview ─────────────────────────────────────────── */
export function AnalyticsPreview() {
  return (
    <PhoneFrame className="w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-100">Analytics</h3>
        <div className="h-6 px-2 rounded border border-slate-700 bg-slate-800 flex items-center">
          <span className="text-[10px] text-slate-300">6 months</span>
        </div>
      </div>

      {/* Insights card */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 mb-4">
        <p className="text-[10px] text-blue-400 font-medium mb-1">Insights</p>
        <p className="text-[10px] text-slate-300 leading-relaxed">
          Spending is down 12% from last month. Food is your top category at 34%.
        </p>
      </div>

      {/* Bar chart mockup */}
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Month on Month</p>
      <div className="flex items-end gap-1.5 h-24 mb-4">
        {[40, 65, 55, 80, 70, 60].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
              style={{ height: `${h}%` }}
            />
            <span className="text-[8px] text-slate-500">
              {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][i]}
            </span>
          </div>
        ))}
      </div>

      {/* Pie chart mockup */}
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Category Breakdown</p>
      <div className="flex items-center gap-3">
        {/* SVG pie */}
        <svg viewBox="0 0 36 36" className="w-16 h-16 shrink-0">
          <circle cx="18" cy="18" r="15.92" fill="none" stroke="#3b82f6" strokeWidth="5" strokeDasharray="34 66" strokeDashoffset="25" />
          <circle cx="18" cy="18" r="15.92" fill="none" stroke="#8b5cf6" strokeWidth="5" strokeDasharray="24 76" strokeDashoffset="91" />
          <circle cx="18" cy="18" r="15.92" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray="22 78" strokeDashoffset="67" />
          <circle cx="18" cy="18" r="15.92" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="20 80" strokeDashoffset="45" />
        </svg>
        <div className="space-y-1.5">
          {[
            { label: "Food", pct: "34%", color: "bg-blue-500" },
            { label: "Bills", pct: "24%", color: "bg-purple-500" },
            { label: "Transport", pct: "22%", color: "bg-green-500" },
            { label: "Fun", pct: "20%", color: "bg-yellow-500" },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${c.color}`} />
              <span className="text-[10px] text-slate-300">{c.label}</span>
              <span className="text-[10px] text-slate-500">{c.pct}</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ── Expenses Preview ──────────────────────────────────────────── */
export function ExpensesPreview() {
  return (
    <PhoneFrame className="w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">All Expenses</h3>
          <p className="text-[9px] text-slate-500">Household · 47 transactions</p>
        </div>
        <div className="flex gap-1.5">
          <div className="h-7 px-2 rounded-md border border-slate-700 bg-slate-800 flex items-center gap-1">
            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span className="text-[10px] text-slate-300">CSV</span>
          </div>
          <div className="h-7 w-14 rounded-md bg-blue-600 flex items-center justify-center">
            <span className="text-[10px] font-medium text-white">+ Add</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2">
          <p className="text-[9px] text-slate-500">Total Spent</p>
          <p className="text-sm font-semibold text-slate-100">$2,485</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2">
          <p className="text-[9px] text-slate-500">Total Owed</p>
          <p className="text-sm font-semibold text-slate-100">$245</p>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex gap-1.5 mb-3">
        <div className="flex-1 h-7 rounded border border-slate-700 bg-slate-800 flex items-center px-2">
          <span className="text-[10px] text-slate-400">All Months</span>
        </div>
        <div className="flex-1 h-7 rounded border border-blue-500/30 bg-blue-500/10 flex items-center px-2">
          <span className="text-[10px] text-blue-300">Paid by: You</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <div className="h-7 rounded border border-slate-700 bg-slate-900 pl-7 flex items-center">
          <span className="text-[10px] text-slate-500">Search expenses...</span>
        </div>
      </div>

      {/* Expense items */}
      {[
        { desc: "Whole Foods", amount: "$127.35", cat: "Food", date: "Mar 10", who: "You", color: "bg-green-500/20 text-green-400" },
        { desc: "Netflix", amount: "$15.99", cat: "Subs", date: "Mar 8", who: "Alex", color: "bg-purple-500/20 text-purple-400" },
        { desc: "Uber", amount: "$24.50", cat: "Transport", date: "Mar 7", who: "You", color: "bg-blue-500/20 text-blue-400" },
        { desc: "Gym Membership", amount: "$49.00", cat: "Health", date: "Mar 5", who: "Alex", color: "bg-orange-500/20 text-orange-400" },
      ].map((e) => (
        <div key={e.desc} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full shrink-0 ${e.color}`}>{e.cat}</span>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-200 truncate">{e.desc}</p>
              <p className="text-[9px] text-slate-500">{e.who} · {e.date}</p>
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-100 shrink-0">{e.amount}</p>
        </div>
      ))}
    </PhoneFrame>
  );
}

/* ── Split Preview (for feature showcase) ──────────────────────── */
export function SplitPreview() {
  return (
    <PhoneFrame className="w-[280px]">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-100 mb-1">Add Expense</h3>
        <p className="text-[10px] text-slate-400">Household · Groceries</p>
      </div>

      {/* Expense form mockup */}
      <div className="space-y-3">
        <div>
          <p className="text-[9px] text-slate-400 mb-1">Description</p>
          <div className="h-8 rounded-lg border border-slate-700 bg-slate-800 flex items-center px-3">
            <span className="text-xs text-slate-200">Weekly Groceries</span>
          </div>
        </div>

        <div>
          <p className="text-[9px] text-slate-400 mb-1">Amount</p>
          <div className="h-8 rounded-lg border border-slate-700 bg-slate-800 flex items-center px-3">
            <span className="text-xs text-slate-200">$156.80</span>
          </div>
        </div>

        <div>
          <p className="text-[9px] text-slate-400 mb-1">Category</p>
          <div className="flex gap-1.5 flex-wrap">
            {["Food", "Bills", "Transport", "Fun"].map((c, i) => (
              <span
                key={c}
                className={`text-[9px] px-2 py-1 rounded-full ${i === 0 ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" : "bg-slate-800 text-slate-400 border border-slate-700"}`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] text-slate-400 mb-1">Split Ratio</p>
          {/* Split slider */}
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-slate-700 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-[60%] rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
            </div>
            <div className="flex justify-between">
              <div className="text-center">
                <p className="text-[10px] font-medium text-blue-400">You: 60%</p>
                <p className="text-[9px] text-slate-500">$94.08</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-medium text-purple-400">Alex: 40%</p>
                <p className="text-[9px] text-slate-500">$62.72</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[9px] text-slate-400 mb-1">Paid By</p>
          <div className="flex gap-2">
            <div className="flex-1 h-7 rounded-lg border border-blue-500/40 bg-blue-500/10 flex items-center justify-center">
              <span className="text-[10px] font-medium text-blue-300">You</span>
            </div>
            <div className="flex-1 h-7 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center">
              <span className="text-[10px] text-slate-400">Alex</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="mt-4 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
        <span className="text-xs font-semibold text-white">Add Expense</span>
      </div>
    </PhoneFrame>
  );
}
