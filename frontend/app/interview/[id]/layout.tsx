import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interview Session",
  description: "AI-powered technical interview session in progress. Answer questions tailored to your role and background.",
  robots: { index: false, follow: false },
};

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
