import Link from "next/link";
import { CATEGORIES } from "@/lib/blog";

interface CategoryBadgeProps {
  category: string;
  linked?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  "couples-finance": "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25",
  "budgeting-tracking": "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
  "expense-splitting": "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25",
  "life-events": "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
  "financial-health": "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25",
  guides: "bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25",
};

export function CategoryBadge({ category, linked = true }: CategoryBadgeProps) {
  const label = CATEGORIES[category] ?? category;
  const color =
    CATEGORY_COLORS[category] ?? "bg-slate-500/15 text-slate-400 hover:bg-slate-500/25";

  const className = `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${color}`;

  if (linked) {
    return (
      <Link href={`/blog/category/${category}`} className={className}>
        {label}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}
