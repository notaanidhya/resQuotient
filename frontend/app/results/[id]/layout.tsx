import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interview Results",
  description: "Your AI-generated post-interview assessment, insights, and full session transcript.",
  robots: { index: false, follow: false },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
