import type { LucideIcon } from "lucide-react";
import {
  Home,
  ShoppingCart,
  Utensils,
  Car,
  ShoppingBag,
  Heart,
  Film,
  MoreHorizontal,
  Shield,
  CreditCard,
  Receipt,
  Plane,
  Gift,
  Hammer,
  GraduationCap,
  TrendingUp,
  Tag,
} from "lucide-react";

const CATEGORY_PALETTE = [
  { text: "text-emerald-400", border: "border-emerald-800" },
  { text: "text-sky-400", border: "border-sky-800" },
  { text: "text-rose-400", border: "border-rose-800" },
  { text: "text-amber-400", border: "border-amber-800" },
  { text: "text-violet-400", border: "border-violet-800" },
  { text: "text-cyan-400", border: "border-cyan-800" },
  { text: "text-pink-400", border: "border-pink-800" },
  { text: "text-lime-400", border: "border-lime-800" },
  { text: "text-teal-400", border: "border-teal-800" },
  { text: "text-orange-400", border: "border-orange-800" },
  { text: "text-indigo-400", border: "border-indigo-800" },
  { text: "text-fuchsia-400", border: "border-fuchsia-800" },
  { text: "text-yellow-400", border: "border-yellow-800" },
  { text: "text-red-400", border: "border-red-800" },
  { text: "text-blue-400", border: "border-blue-800" },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Housing & Utilities": Home,
  "Groceries": ShoppingCart,
  "Food & Dining": Utensils,
  "Transportation": Car,
  "Shopping & Lifestyle": ShoppingBag,
  "Health & Wellness": Heart,
  "Entertainment & Subs": Film,
  "Miscellaneous": MoreHorizontal,
  "Insurance & Premiums": Shield,
  "Subscriptions & Memberships": CreditCard,
  "Taxes & EMIs": Receipt,
  "Travel & Vacations": Plane,
  "Gifts & Celebrations": Gift,
  "Home Improvement": Hammer,
  "Education": GraduationCap,
  "Investments": TrendingUp,
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getCategoryColor(categoryName: string): {
  text: string;
  border: string;
} {
  const index = hashString(categoryName) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[index];
}

export function getCategoryIcon(categoryName: string): LucideIcon {
  return CATEGORY_ICONS[categoryName] ?? Tag;
}
