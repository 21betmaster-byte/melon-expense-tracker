import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://expensetracker-kappa-six.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/*", "/login", "/signup"],
        disallow: [
          "/dashboard",
          "/expenses",
          "/analytics",
          "/goals",
          "/settings",
          "/onboarding",
          "/api/*",
          "/invite/*",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
