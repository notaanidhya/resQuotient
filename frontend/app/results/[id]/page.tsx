"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { api, SessionSummary, QAPair } from "@/lib/api";

const stagger: Variants = { visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

function QAItem({ pair, index }: { pair: QAPair; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}
    >
      <button
        id={`qa-toggle-${index + 1}`}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
        style={{ background: "transparent" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span
          className="text-xs font-bold tabular-nums flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent-dim)", color: "#8898fc", border: "1px solid var(--accent-border)" }}
        >
          Q{pair.sequence_number}
        </span>
        <span className="flex-1 text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
          {pair.question}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: "var(--text-secondary)", flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.span>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="px-5 pb-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="pt-3">
            <div className="text-xs font-medium mb-2" style={{ color: "var(--text-dim)" }}>
              YOUR ANSWER
            </div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {pair.answer}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function ResultsPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getSummary(sessionId)
      .then((data) => { setSummary(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load results.");
        setLoading(false);
      });
  }, [sessionId]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "var(--accent)",
                  animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Generating your assessment...
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            This may take a moment
          </div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-sm text-center flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Results unavailable</div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</div>
          </div>
          <a href="/" className="btn-secondary" id="back-home-error">Return home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute rounded-full blur-3xl opacity-10"
          style={{
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(34,197,94,0.5) 0%, transparent 70%)",
            top: "-5%",
            right: "-10%",
          }}
        />
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-8 py-4"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(6,6,15,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center px-2.5 py-1 rounded-lg text-white font-bold text-xs"
            style={{ background: "linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)", fontFamily: "var(--font-outfit)", letterSpacing: "-0.02em" }}
          >
            resQ
          </div>
          <span className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)", fontFamily: "var(--font-outfit)" }}>
            resQuotient
          </span>
        </div>
        <a href="/" id="new-session-header" className="btn-secondary" style={{ fontSize: 13, padding: "8px 16px" }}>
          New session
        </a>
      </header>

      <main id="main-content" className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="flex flex-col gap-6"
          >
            {/* Page header */}
            <motion.div variants={fadeUp} className="flex flex-col gap-3">
              <div
                className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full self-start"
                style={{ background: "var(--success-dim)", border: "1px solid var(--success-border)", color: "#4ade80" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Session complete
              </div>
              <h1
                className="text-3xl md:text-4xl font-bold tracking-tight"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-outfit)",
                  background: "linear-gradient(135deg, #eeeef8 0%, #8898fc 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {summary.candidate_name ? `${summary.candidate_name}'s Interview` : "Interview Summary"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="tag tag-accent">{summary.role}</span>
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>·</span>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>{formatDate(summary.created_at)}</span>
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>·</span>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>{summary.qa_pairs.length} questions</span>
              </div>
            </motion.div>

            {/* Overall Assessment */}
            <motion.section
              variants={fadeUp}
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(92,110,248,0.08) 0%, rgba(139,92,246,0.05) 100%)",
                border: "1px solid var(--accent-border)",
              }}
              aria-labelledby="assessment-heading"
            >
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }}
              />
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }} id="assessment-heading">
                Overall Assessment
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {summary.overall_assessment}
              </p>
            </motion.section>

            {/* Insights */}
            <motion.section
              variants={fadeUp}
              className="rounded-2xl p-6"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              aria-labelledby="insights-heading"
            >
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-secondary)" }} id="insights-heading">
                Detailed Analysis
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {summary.insights}
              </p>
            </motion.section>

            {/* Topics */}
            {summary.topics_covered.length > 0 && (
              <motion.section variants={fadeUp} aria-labelledby="topics-heading">
                <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-secondary)" }} id="topics-heading">
                  Topics Covered
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.topics_covered.map((t, i) => (
                    <motion.span
                      key={t}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="tag tag-accent"
                    >
                      {t}
                    </motion.span>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Transcript */}
            <motion.section variants={fadeUp} aria-labelledby="transcript-heading">
              <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--text-secondary)" }} id="transcript-heading">
                Interview Transcript
              </div>
              <motion.div className="flex flex-col gap-2.5" variants={stagger} initial="hidden" animate="visible">
                {summary.qa_pairs.map((pair, i) => (
                  <QAItem key={i} pair={pair} index={i} />
                ))}
              </motion.div>
            </motion.section>

            {/* CTA */}
            <motion.div variants={fadeUp} className="pt-2">
              <a
                href="/"
                id="start-new-session"
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Start a new session
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
