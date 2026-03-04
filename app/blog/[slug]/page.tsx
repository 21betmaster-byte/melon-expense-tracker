import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { getAllPostMeta, getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { mdxComponents } from "@/components/blog/MDXComponents";
import { CategoryBadge } from "@/components/blog/CategoryBadge";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { CTABanner } from "@/components/blog/CTABanner";

// ─── Static generation ──────────────────────────────────────────────────────

export function generateStaticParams() {
  const posts = getAllPostMeta();
  return posts.map((post) => ({ slug: post.slug }));
}

// ─── Per-page metadata ──────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://expensetracker-kappa-six.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Article Not Found" };

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${BASE_URL}/blog/${post.slug}`,
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${post.slug}`,
    },
  };
}

// ─── Page component ─────────────────────────────────────────────────────────

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = getRelatedPosts(slug, 3);

  // Compile MDX content to React
  const { content } = await compileMDX({
    source: post.content,
    components: mdxComponents,
  });

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Melon",
      url: BASE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${post.slug}`,
    },
    keywords: post.keywords.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/blog" className="flex items-center gap-1 hover:text-white transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Blog
          </Link>
          <span>/</span>
          <CategoryBadge category={post.category} />
        </nav>

        <div className="flex gap-10">
          {/* Main content */}
          <article className="min-w-0 flex-1">
            {/* Header */}
            <header className="mb-10">
              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                {post.title}
              </h1>
              <p className="mt-4 text-lg text-slate-400">{post.description}</p>
              <div className="mt-5 flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {post.readTime} min read
                </span>
                <span>By {post.author}</span>
              </div>
            </header>

            {/* MDX content */}
            <div className="prose-custom">{content}</div>

            {/* Bottom CTA */}
            <CTABanner />
          </article>

          {/* Table of Contents sidebar */}
          <TableOfContents />
        </div>

        {/* Related Posts */}
        <RelatedPosts posts={relatedPosts} />
      </div>
    </>
  );
}
