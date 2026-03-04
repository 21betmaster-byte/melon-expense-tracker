import type { Metadata } from "next";
import { getAllPostMeta, getAllCategories, CATEGORIES } from "@/lib/blog";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { CategoryBadge } from "@/components/blog/CategoryBadge";

export const metadata: Metadata = {
  title: "Blog — Couples Finance Tips & Guides",
  description:
    "Expert tips on splitting expenses, budgeting as a couple, and building healthy financial habits together.",
  openGraph: {
    title: "Melon Blog — Couples Finance Tips & Guides",
    description:
      "Expert tips on splitting expenses, budgeting as a couple, and building healthy financial habits together.",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPostMeta();
  const categories = getAllCategories();

  const featured = posts.find((p) => p.featured);
  const rest = posts.filter((p) => p.slug !== featured?.slug);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-white md:text-5xl">
          Melon Blog
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          Practical tips and guides on splitting expenses, budgeting together,
          and building a healthy financial life as a couple.
        </p>
      </div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <CategoryBadge key={cat} category={cat} />
          ))}
        </div>
      )}

      {/* Featured Article */}
      {featured && (
        <div className="mb-10">
          <ArticleCard post={featured} featured />
        </div>
      )}

      {/* All Articles Grid */}
      {rest.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <ArticleCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="py-20 text-center text-slate-500">
          <p className="text-lg">No articles yet. Check back soon!</p>
        </div>
      )}

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Melon Blog — Couples Finance Tips & Guides",
            description:
              "Expert tips on splitting expenses, budgeting as a couple, and building healthy financial habits together.",
            url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://expensetracker-kappa-six.vercel.app"}/blog`,
            publisher: {
              "@type": "Organization",
              name: "Melon",
              url: process.env.NEXT_PUBLIC_APP_URL ?? "https://expensetracker-kappa-six.vercel.app",
            },
          }),
        }}
      />
    </main>
  );
}
