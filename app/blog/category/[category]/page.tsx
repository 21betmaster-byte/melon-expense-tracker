import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  getAllCategories,
  getPostsByCategory,
  CATEGORIES,
} from "@/lib/blog";
import { ArticleCard } from "@/components/blog/ArticleCard";

// ─── Static generation ──────────────────────────────────────────────────────

export function generateStaticParams() {
  const categories = getAllCategories();
  return categories.map((category) => ({ category }));
}

// ─── Per-page metadata ──────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const label = CATEGORIES[category] ?? category;

  return {
    title: `${label} — Melon Blog`,
    description: `Browse all Melon articles about ${label.toLowerCase()}. Tips, guides, and expert advice for couples.`,
  };
}

// ─── Page component ─────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const posts = getPostsByCategory(category);
  const label = CATEGORIES[category] ?? category;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      {/* Breadcrumbs */}
      <nav className="mb-8">
        <Link
          href="/blog"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All articles
        </Link>
      </nav>

      {/* Category Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white md:text-4xl">{label}</h1>
        <p className="mt-3 text-lg text-slate-400">
          {posts.length} article{posts.length !== 1 ? "s" : ""} in this
          category
        </p>
      </div>

      {/* Articles Grid */}
      {posts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <ArticleCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500">
          <p className="text-lg">No articles in this category yet.</p>
          <Link href="/blog" className="mt-3 inline-block text-blue-400 hover:underline">
            Browse all articles
          </Link>
        </div>
      )}
    </main>
  );
}
