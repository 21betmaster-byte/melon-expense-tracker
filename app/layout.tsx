import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://expensetracker-kappa-six.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Melon — Expense Manager for Couples",
    template: "%s | Melon",
  },
  description:
    "Manage shared expenses together. Track spending, settle up, and see where your money goes.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Melon",
  },
  openGraph: {
    type: "website",
    siteName: "Melon",
    title: "Melon — Expense Manager for Couples",
    description:
      "Manage shared expenses together. Track spending, settle up, and see where your money goes.",
    url: BASE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Melon — Expense Manager for Couples",
    description:
      "Manage shared expenses together. Track spending, settle up, and see where your money goes.",
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100 min-h-screen`}
      >
        {children}
        <Toaster richColors position="top-center" />
        {/* Clean up RSC flight-data scripts so body.textContent stays clean in E2E tests.
            Uses a repeating interval to catch scripts as they arrive, after Next.js consumes them. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                function clean(){
                  document.querySelectorAll('script').forEach(function(s){
                    if(!s.src && s.textContent && (
                      s.textContent.indexOf('self.__next_f')!==-1 ||
                      s.textContent.indexOf('self.__next_r')!==-1
                    )){
                      s.textContent='';
                    }
                  });
                }
                var iv=setInterval(clean,500);
                setTimeout(function(){clearInterval(iv);},30000);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
