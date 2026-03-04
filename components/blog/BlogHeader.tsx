import Link from "next/link";

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🍈</span>
          <span className="text-lg font-bold text-white">Melon</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link
            href="/blog"
            className="text-slate-400 transition-colors hover:text-white"
          >
            Blog
          </Link>
          <Link
            href="/#features"
            className="text-slate-400 transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="/login"
            className="text-slate-400 transition-colors hover:text-white"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Sign Up Free
          </Link>
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/login"
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
