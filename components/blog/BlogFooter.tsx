import Link from "next/link";

export function BlogFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍈</span>
              <span className="text-lg font-bold text-white">Melon</span>
            </Link>
            <p className="mt-3 text-sm text-slate-400">
              The expense manager built for couples. Track spending, split
              bills, and stay on the same page — together.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Product</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/#features" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Resources</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link
                  href="/blog/category/couples-finance"
                  className="hover:text-white transition-colors"
                >
                  Couples Finance 101
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/category/budgeting-tracking"
                  className="hover:text-white transition-colors"
                >
                  Budgeting Tips
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/category/expense-splitting"
                  className="hover:text-white transition-colors"
                >
                  Expense Splitting
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500"
          suppressHydrationWarning
        >
          &copy; {new Date().getFullYear()} Melon. Built with love for couples
          who care about money.
        </div>
      </div>
    </footer>
  );
}
