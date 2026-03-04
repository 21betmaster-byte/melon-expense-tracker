import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import type { BlogPostMeta } from "@/lib/blog";
import { CategoryBadge } from "./CategoryBadge";

interface ArticleCardProps {
  post: BlogPostMeta;
  featured?: boolean;
}

export function ArticleCard({ post, featured = false }: ArticleCardProps) {
  return (
    <article
      className={`group rounded-2xl border border-white/10 bg-slate-900/50 p-6 transition-all hover:border-blue-500/30 hover:bg-slate-900/80 ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <CategoryBadge category={post.category} />
          {post.featured && (
            <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-400">
              Featured
            </span>
          )}
        </div>

        <Link href={`/blog/${post.slug}`} className="group-hover:underline">
          <h2
            className={`font-bold leading-tight text-white ${
              featured ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
            }`}
          >
            {post.title}
          </h2>
        </Link>

        <p className="text-sm leading-relaxed text-slate-400 line-clamp-2">
          {post.description}
        </p>

        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readTime} min read
          </span>
        </div>
      </div>
    </article>
  );
}
