"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import ResumeUpload from "@/components/ResumeUpload";
import { api, Role } from "@/lib/api";
import { useNexusStore } from "@/lib/store";

type Step = "role" | "resume" | "starting";

const ROLE_ICONS: Record<string, string> = {
  "AI/ML Engineer": "🧠",
  "Backend Engineer": "⚙️",
  "Data Scientist": "📊",
  "Full Stack Engineer": "🌐",
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function HomePage() {
  const router = useRouter();
  const setSession = useNexusStore((s) => s.setSession);

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [candidateName, setCandidateName] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("role");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    api.getRoles().then((res) => {
      setRoles(res.roles);
      setRolesLoading(false);
    });
  }, []);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setError("");
  };

  const handleProceedToResume = () => {
    if (!selectedRole) {
      setError("Select a role to continue.");
      return;
    }
    setStep("resume");
    setError("");
  };

  const handleStartInterview = async () => {
    if (!resumeFile) {
      setError("Upload your resume to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const session = await api.createSession(selectedRole, candidateName || undefined);
      await api.uploadResume(session.id, resumeFile);
      setSession(session.id, selectedRole, candidateName);
      router.push(`/interview/${session.id}`);
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Ambient background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(92,110,248,0.6) 0%, transparent 70%)",
            top: "-15%",
            left: "-10%",
            animation: "orb-drift 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-10"
          style={{
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)",
            bottom: "10%",
            right: "5%",
            animation: "orb-drift 24s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-8 py-4"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(6,6,15,0.7)",
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
        <span
          className="text-xs font-medium tracking-widest uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          AI Interview Platform
        </span>
      </header>

      {/* Main */}
      <main id="main-content" className="flex-1 flex flex-col items-center px-6 py-16 gap-12">
        {/* Hero */}
        <motion.div
          className="text-center max-w-2xl"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-6"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              color: "#8898fc",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Powered by Gemini + RAG Pipeline
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-tight"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-outfit)",
              background: "linear-gradient(135deg, #eeeef8 0%, #8898fc 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Technical interviews grounded in knowledge, not guesswork.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-base leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Upload your resume and select a role. The system retrieves domain-specific knowledge
            and generates questions precisely tailored to your background.
          </motion.p>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-lg glass-card p-8 relative"
          style={{ boxShadow: "0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}
        >
          <AnimatePresence mode="wait">
            {step === "role" && (
              <motion.div
                key="role"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="text-xs font-bold tracking-widest mt-0.5"
                    style={{ color: "var(--accent)" }}
                  >
                    01
                  </span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Select your target role
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      Questions will be scoped to this domain&apos;s knowledge base
                    </div>
                  </div>
                </div>

                {/* Role grid */}
                {rolesLoading ? (
                  <motion.div className="grid grid-cols-2 gap-2.5" variants={stagger} initial="hidden" animate="visible">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="skeleton h-20 rounded-xl" />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid grid-cols-2 gap-2.5"
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                  >
                    {roles.map((role) => {
                      const isSelected = selectedRole === role.value;
                      return (
                        <motion.button
                          key={role.value}
                          id={`role-${role.value.toLowerCase().replace(/[\s/]/g, "-")}`}
                          variants={cardVariant}
                          onClick={() => handleRoleSelect(role.value)}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex flex-col items-start gap-2 p-4 text-left rounded-xl transition-colors relative overflow-hidden"
                          style={{
                            background: isSelected ? "var(--accent-dim)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                            boxShadow: isSelected ? "0 0 24px rgba(92,110,248,0.15)" : "none",
                          }}
                          aria-pressed={isSelected}
                        >
                          {isSelected && (
                            <div
                              className="absolute inset-0 opacity-5"
                              style={{
                                background: "linear-gradient(135deg, var(--accent), transparent)",
                              }}
                            />
                          )}
                          <span className="text-xl">{ROLE_ICONS[role.value] ?? "💼"}</span>
                          <div>
                            <div
                              className="text-xs font-semibold leading-snug"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {role.label}
                            </div>
                            <div
                              className="text-[11px] mt-1 leading-snug"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {role.description}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}

                {/* Name input */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="candidate-name" className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    Your name{" "}
                    <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    id="candidate-name"
                    type="text"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="e.g. Arjun Sharma"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    maxLength={80}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs px-3.5 py-2.5 rounded-lg"
                    style={{
                      color: "var(--danger)",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  id="proceed-to-resume"
                  className="btn-primary w-full"
                  onClick={handleProceedToResume}
                  disabled={!selectedRole}
                  whileHover={selectedRole ? { scale: 1.01 } : {}}
                  whileTap={selectedRole ? { scale: 0.99 } : {}}
                >
                  Continue
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </motion.button>
              </motion.div>
            )}

            {step === "resume" && (
              <motion.div
                key="resume"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <button
                    id="back-to-role"
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                    onClick={() => { setStep("role"); setError(""); }}
                    disabled={loading}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back
                  </button>
                  <span
                    className="text-xs font-medium px-3 py-1 rounded-full"
                    style={{
                      background: "var(--accent-dim)",
                      border: "1px solid var(--accent-border)",
                      color: "#8898fc",
                    }}
                  >
                    {selectedRole}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold tracking-widest mt-0.5" style={{ color: "var(--accent)" }}>
                    02
                  </span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Upload your resume
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      Used to tailor questions to your background and experience level
                    </div>
                  </div>
                </div>

                <ResumeUpload onFile={setResumeFile} file={resumeFile} disabled={loading} />

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs px-3.5 py-2.5 rounded-lg"
                    style={{
                      color: "var(--danger)",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  id="start-interview"
                  className="btn-primary w-full"
                  onClick={handleStartInterview}
                  disabled={loading || !resumeFile}
                  whileHover={!loading && resumeFile ? { scale: 1.01 } : {}}
                  whileTap={!loading && resumeFile ? { scale: 0.99 } : {}}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Setting up interview...
                    </>
                  ) : (
                    <>
                      Start Interview
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Feature chips */}
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {[
            "Domain-grounded questions via RAG",
            "Adapts to your experience level",
            "Full transcript with AI assessment",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
              style={{
                color: "var(--text-secondary)",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "var(--accent)" }}
              />
              {f}
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
