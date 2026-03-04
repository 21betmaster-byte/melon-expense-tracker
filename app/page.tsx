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
} from "lucide-react";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { getAllPostMeta } from "@/lib/blog";
import { ArticleCard } from "@/components/blog/ArticleCard";

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

        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center md:py-32">
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
            Free for couples
          </div>

          <h1 className="text-4xl font-extrabold leading-tight text-white md:text-6xl">
            Track Expenses
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Together
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 md:text-xl">
            Melon is the expense manager built for couples. Split bills fairly,
            track shared spending, and never argue about money again.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
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
