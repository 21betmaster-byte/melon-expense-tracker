import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { CTABanner } from "./CTABanner";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Custom MDX component overrides for consistent blog styling. */
export const mdxComponents: MDXComponents = {
  // Headings with auto-generated IDs for TOC
  h1: ({ children, ...props }) => (
    <h1
      id={slugify(String(children))}
      className="mt-10 mb-4 text-3xl font-bold text-white"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      id={slugify(String(children))}
      className="mt-10 mb-4 text-2xl font-bold text-white scroll-mt-24"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      id={slugify(String(children))}
      className="mt-8 mb-3 text-xl font-semibold text-white scroll-mt-24"
      {...props}
    >
      {children}
    </h3>
  ),

  // Paragraphs
  p: ({ children, ...props }) => (
    <p className="mb-5 leading-7 text-slate-300" {...props}>
      {children}
    </p>
  ),

  // Links
  a: ({ href, children, ...props }) => {
    const isExternal = href?.startsWith("http");
    if (isExternal) {
      return (
        <a
          href={href}
          className="text-blue-400 underline decoration-blue-400/30 underline-offset-4 transition-colors hover:text-blue-300"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }
    return (
      <Link
        href={href ?? "/"}
        className="text-blue-400 underline decoration-blue-400/30 underline-offset-4 transition-colors hover:text-blue-300"
        {...props}
      >
        {children}
      </Link>
    );
  },

  // Lists
  ul: ({ children, ...props }) => (
    <ul className="mb-5 ml-6 list-disc space-y-2 text-slate-300" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-5 ml-6 list-decimal space-y-2 text-slate-300" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-7" {...props}>
      {children}
    </li>
  ),

  // Blockquotes
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-6 border-l-4 border-blue-500/50 bg-blue-500/5 py-3 pl-6 pr-4 text-slate-300 italic"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Code
  code: ({ children, ...props }) => (
    <code
      className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-blue-300"
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="my-6 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm"
      {...props}
    >
      {children}
    </pre>
  ),

  // Horizontal rule
  hr: () => <hr className="my-10 border-white/10" />,

  // Strong and emphasis
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-white" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="text-slate-200" {...props}>
      {children}
    </em>
  ),

  // Table
  table: ({ children, ...props }) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      className="bg-slate-900 px-4 py-3 text-left font-semibold text-white"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-t border-white/10 px-4 py-3 text-slate-300" {...props}>
      {children}
    </td>
  ),

  // Custom components available in MDX
  CTABanner,
};
