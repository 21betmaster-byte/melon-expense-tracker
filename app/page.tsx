import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  PieChart,
  Bell,
  Users,
  Wallet,
  TrendingUp,
  Shield,
  CheckCircle,
} from "lucide-react";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { getAllPostMeta } from "@/lib/blog";
import { ArticleCard } from "@/components/blog/ArticleCard";
import {
  DashboardPreview,
  AnalyticsPreview,
  ExpensesPreview,
  SplitPreview,
} from "@/components/landing/AppPreviews";

export const metadata: Metadata = {
  title: "Melon — Expense Manager for Couples | Track & Split Expenses Together",
  description:
    "Melon helps couples track shared expenses, split bills fairly, and stay financially in sync. Free, real-time, and built for two.",
  keywords: [
    "couples expense tracker",
    "split expenses couple",
    "shared expense app",
    "couples budget app",
    "expense splitting app",
  ],
};

const FEATURES = [
  {
    icon: Users,
    title: "Built for Two",
    description:
      "Designed exclusively for couples. Invite your partner and start tracking together in minutes.",
  },
  {
    icon: Wallet,
    title: "Smart Splitting",
    description:
      "Split expenses 50/50, by percentage, or by income ratio. Every couple is different.",
  },
  {
    icon: PieChart,
    title: "Visual Analytics",
    description:
      "See where your money goes with beautiful charts. Category breakdowns, trends, and month-over-month comparisons.",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description:
      "Get notified instantly when your partner adds an expense or records a settlement.",
  },
  {
    icon: TrendingUp,
    title: "Savings Goals",
    description:
      "Set shared savings goals and track progress together. Vacations, emergencies, big purchases.",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description:
      "Your data stays between you two. Firebase-powered with end-to-end encryption in transit.",
  },
];

const PAIN_POINTS = [
  {
    problem: "\"Who paid for groceries last week?\"",
    solution: "Every expense is logged with who paid, the category, and how it's split — instantly visible to both of you.",
  },
  {
    problem: "\"I feel like I'm always the one paying.\"",
    solution: "Real-time settlement tracking shows exactly who owes what, with one-tap settle up.",
  },
  {
    problem: "\"We have no idea where our money goes.\"",
    solution: "Visual analytics break down spending by category, month, and member — patterns become obvious.",
  },
  {
    problem: "\"Spreadsheets are too much work.\"",
    solution: "Add expenses in seconds. Smart categories, templates for recurring bills, and CSV export when you need it.",
  },
];

export default function HomePage() {
  const recentPosts = getAllPostMeta().slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Melon",
    description:
      "Expense manager for couples — track spending, split bills, and stay financially in sync.",
    url:
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://expensetracker-kappa-six.vercel.app",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <BlogHeader />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/10" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Left: Copy */}
            <div className="text-center md:text-left">
              <div className="mb-6 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
                Free for couples
              </div>

              <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
                Track Expenses
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Together
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-lg text-lg text-slate-400 md:mx-0 md:text-xl">
                Melon is the expense manager built for couples. Split bills
                fairly, track shared spending, and never argue about money
                again.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row md:justify-start sm:justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3 text-base font-medium text-slate-300 transition-colors hover:bg-white/10"
                >
                  Log In
                </Link>
              </div>
            </div>

            {/* Right: Dashboard phone mockup */}
            <div className="flex justify-center md:justify-end">
              <div className="relative">
                <div className="absolute -inset-8 rounded-full bg-blue-500/5 blur-2xl" />
                <div className="relative">
                  <DashboardPreview />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── App Showcase ──────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-20 overflow-hidden">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              See Melon in action
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Here&apos;s what managing money as a couple actually looks like —
              simple, visual, and always in sync.
            </p>
          </div>

          {/* Showcase 1: Smart Splitting */}
          <div className="grid items-center gap-12 md:grid-cols-2 mb-24">
            <div className="flex justify-center md:order-2">
              <SplitPreview />
            </div>
            <div className="md:order-1">
              <div className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-400 border border-purple-500/20 mb-4">
                Smart Splitting
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Split expenses your way
              </h3>
              <p className="text-slate-400 mb-6">
                Not every expense is a 50/50 split. Adjust the ratio for each
                expense — whether one partner earns more, or you just want to
                treat each other sometimes.
              </p>
              <ul className="space-y-3">
                {[
                  "Custom split ratios per expense",
                  "Track who paid at a glance",
                  "Smart categories with templates",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Showcase 2: Analytics */}
          <div className="grid items-center gap-12 md:grid-cols-2 mb-24">
            <div className="flex justify-center">
              <AnalyticsPreview />
            </div>
            <div>
              <div className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400 border border-blue-500/20 mb-4">
                Visual Analytics
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Know exactly where your money goes
              </h3>
              <p className="text-slate-400 mb-6">
                Beautiful charts that make spending patterns obvious. Monthly
                trends, category breakdowns, and AI-powered insights — all
                updated in real-time.
              </p>
              <ul className="space-y-3">
                {[
                  "Month-over-month spending trends",
                  "Category pie charts and bar graphs",
                  "Per-member contribution breakdown",
                  "Filter by time period, currency, or category",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Showcase 3: Expense Management */}
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="flex justify-center md:order-2">
              <ExpensesPreview />
            </div>
            <div className="md:order-1">
              <div className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400 border border-green-500/20 mb-4">
                Full Control
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Search, filter, and export everything
              </h3>
              <p className="text-slate-400 mb-6">
                Every transaction at your fingertips. Filter by month, payer,
                or amount. Search across descriptions and categories. Export
                to CSV anytime.
              </p>
              <ul className="space-y-3">
                {[
                  "Full-text search across all expenses",
                  "Filter by month, payer, and amount range",
                  "One-click CSV export",
                  "Recurring expense tracking",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain Points / Problems We Solve ───────────────────────── */}
      <section className="border-t border-white/5 py-20 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Sound familiar?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Money is the #1 source of conflict for couples. Melon eliminates
              the guesswork.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {PAIN_POINTS.map((pp) => (
              <div
                key={pp.problem}
                className="rounded-2xl border border-white/10 bg-slate-900/30 p-6"
              >
                <p className="text-base font-medium text-red-400/80 mb-3 italic">
                  {pp.problem}
                </p>
                <div className="h-px bg-white/5 my-3" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  {pp.solution}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Everything you need to manage money as a couple
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              No more spreadsheets, no more awkward &quot;who owes what&quot;
              conversations. Melon handles it all.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-slate-900/30 p-6 transition-colors hover:border-blue-500/20 hover:bg-slate-900/50"
              >
                <div className="mb-4 inline-flex rounded-lg bg-blue-500/10 p-2.5">
                  <feature.icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Get started in 3 steps
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Sign Up",
                desc: "Create your free account in under a minute. No credit card required.",
              },
              {
                step: "2",
                title: "Invite Your Partner",
                desc: "Send a one-tap invite link. They join your household instantly.",
              },
              {
                step: "3",
                title: "Start Tracking",
                desc: "Add expenses, set split ratios, and watch your dashboard come alive.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blog Preview ───────────────────────────────────────────── */}
      {recentPosts.length > 0 && (
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mb-10 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white md:text-3xl">
                From the Blog
              </h2>
              <Link
                href="/blog"
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentPosts.map((post) => (
                <ArticleCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Ready to get on the same page?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Join couples who track expenses together with Melon. Free forever
            for essential features.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25"
          >
            Sign Up Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <BlogFooter />
    </>
  );
}
