import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CTABannerProps {
  heading?: string;
  description?: string;
}

export function CTABanner({
  heading = "Ready to manage expenses together?",
  description = "Melon makes it easy for couples to track spending, split bills fairly, and stay financially in sync. Free to get started.",
}: CTABannerProps) {
  return (
    <div className="my-10 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-purple-600/10 p-8 text-center">
      <h3 className="text-xl font-bold text-white">{heading}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        {description}
      </p>
      <Link
        href="/signup"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
      >
        Try Melon Free
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
