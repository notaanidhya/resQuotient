import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#5c6ef8",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://nexus-screening.ai"),
  title: {
    default: "resQuotient — AI-Powered Technical Interviews",
    template: "%s | resQuotient",
  },
  description:
    "Role-based candidate screening powered by RAG. Generates contextual interview questions grounded in domain knowledge, tailored to your resume and experience level.",
  keywords: [
    "technical interview",
    "AI screening",
    "candidate assessment",
    "RAG pipeline",
    "LLM interview",
    "AI hiring",
  ],
  authors: [{ name: "Nexus AI" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "resQuotient — AI-Powered Technical Interviews",
    description:
      "Contextual, knowledge-grounded technical interviews tailored to your background. Upload your resume and start in under a minute.",
    siteName: "resQuotient",
  },
  twitter: {
    card: "summary_large_image",
    title: "resQuotient — AI-Powered Technical Interviews",
    description:
      "Contextual, knowledge-grounded technical interviews tailored to your background.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body>
        {/* Skip to content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:outline-none"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
