import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  category: string;
  author: string;
  image: string;
  readTime: number;
  featured: boolean;
  keywords: string[];
}

export interface BlogPost extends BlogPostMeta {
  content: string; // raw MDX content (compiled separately)
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BLOG_DIR = path.join(process.cwd(), "content/blog");

// Category display names and slugs
export const CATEGORIES: Record<string, string> = {
  "couples-finance": "Couples Finance 101",
  "budgeting-tracking": "Budgeting & Tracking",
  "expense-splitting": "Expense Splitting",
  "life-events": "Life Events & Money",
  "financial-health": "Financial Health",
  "guides": "Guides & Tutorials",
};

// ─── Utilities ──────────────────────────────────────────────────────────────

function parseFrontmatter(filePath: string): BlogPost {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const slug = path.basename(filePath, ".mdx");
  const stats = readingTime(content);

  return {
    slug,
    title: data.title ?? "",
    description: data.description ?? "",
    date: data.date ?? new Date().toISOString().split("T")[0],
    updated: data.updated ?? data.date ?? new Date().toISOString().split("T")[0],
    category: data.category ?? "guides",
    author: data.author ?? "Melon Team",
    image: data.image ?? "/blog/default.jpg",
    readTime: typeof data.readTime === "number"
      ? data.readTime
      : typeof data.readTime === "string"
        ? parseInt(data.readTime, 10) || Math.ceil(stats.minutes)
        : Math.ceil(stats.minutes),
    featured: data.featured ?? false,
    keywords: data.keywords ?? [],
    content,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Get all blog posts sorted by date (newest first). */
export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));
  const posts = files.map((f) => parseFrontmatter(path.join(BLOG_DIR, f)));

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/** Get all post metadata (without content) — lighter for listings. */
export function getAllPostMeta(): BlogPostMeta[] {
  return getAllPosts().map(({ content: _, ...meta }) => meta);
}

/** Get a single post by slug. Returns null if not found. */
export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  return parseFrontmatter(filePath);
}

/** Get all posts in a specific category. */
export function getPostsByCategory(category: string): BlogPostMeta[] {
  return getAllPostMeta().filter((post) => post.category === category);
}

/** Get all unique categories that have at least one post. */
export function getAllCategories(): string[] {
  const posts = getAllPostMeta();
  const cats = new Set(posts.map((p) => p.category));
  return Array.from(cats);
}

/** Get related posts (same category, excluding current). */
export function getRelatedPosts(slug: string, limit = 3): BlogPostMeta[] {
  const current = getPostBySlug(slug);
  if (!current) return [];

  return getAllPostMeta()
    .filter((p) => p.category === current.category && p.slug !== slug)
    .slice(0, limit);
}
