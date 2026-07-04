"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useNexusStore } from "@/lib/store";
import type { Question } from "@/lib/api";

const MAX_QUESTIONS = 8;
const MIN_ANSWER_LENGTH = 10;

export default function InterviewPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  // Only timer lives in global store — streaming/question state is local
  const { startTimer, tickTimer, elapsedSeconds } = useNexusStore();

  const [question, setQuestion] = useState<Question | null>(null);
  // streamingText is display-only state for the live typewriter effect
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [questionVisible, setQuestionVisible] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref accumulates streamed chunks — avoids functional setState updaters
  // which would cause the "update during render" error
  const streamedTextRef = useRef("");
  // Prevents React Strict Mode's double effect invocation from firing two requests
  const hasInitialized = useRef(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const loadInitialQuestion = useCallback(async () => {
    setLoading(true);
    setIsStreaming(true);
    streamedTextRef.current = "";
    setStreamingText("");

    await api.streamStart(sessionId, {
      onChunk: (chunk) => {
        // Append to ref first, then set display state — never functional updater
        streamedTextRef.current += chunk;
        setStreamingText(streamedTextRef.current);
      },
      onDone: (meta) => {
        // All setState calls are top-level here — no nesting, no render-phase updates
        const finalQ: Question = {
          id: meta.id,
          text: streamedTextRef.current.trim(),
          sequence_number: meta.sequence_number,
          total_questions: meta.total_questions,
          is_last: meta.is_last,
        };
        setQuestion(finalQ);
        setIsStreaming(false);
        setLoading(false);
        setTimeout(() => {
          setQuestionVisible(true);
          textareaRef.current?.focus();
        }, 50);
      },
      onError: (err) => {
        setError(err.message || "Failed to load interview. Check the session ID.");
        setIsStreaming(false);
        setLoading(false);
      },
    });
  }, [sessionId]);

  useEffect(() => {
    // Guard: Strict Mode runs effects twice in dev — we only want one request
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    startTimer();
    loadInitialQuestion();
  }, [loadInitialQuestion, startTimer]);

  useEffect(() => {
    // The interval must be recreated if Strict Mode unmounts and remounts the component
    timerRef.current = setInterval(tickTimer, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tickTimer]);

  const handleSubmit = async () => {
    if (!question) return;
    const trimmed = answer.trim();
    if (trimmed.length < MIN_ANSWER_LENGTH) {
      setError("Please provide a more complete answer before submitting.");
      return;
    }

    setError("");
    setSubmitting(true);
    setQuestionVisible(false);
    streamedTextRef.current = "";
    setStreamingText("");

    let firstChunk = true;

    await api.streamAnswer(sessionId, question.id, trimmed, {
      onChunk: (chunk) => {
        if (firstChunk) {
          // Transition from "submitting" spinner to streaming on first chunk
          firstChunk = false;
          setSubmitting(false);
          setIsStreaming(true);
        }
        streamedTextRef.current += chunk;
        setStreamingText(streamedTextRef.current);
      },
      onDone: (meta) => {
        if (meta.status === "completed") {
          router.push(`/results/${sessionId}`);
          return;
        }
        // All setState calls are top-level — no nesting
        const finalQ: Question = {
          id: meta.id,
          text: streamedTextRef.current.trim(),
          sequence_number: meta.sequence_number,
          total_questions: meta.total_questions,
          is_last: meta.is_last,
        };
        setQuestion(finalQ);
        setAnswer("");
        setIsStreaming(false);
        setSubmitting(false);
        setTimeout(() => {
          setQuestionVisible(true);
          textareaRef.current?.focus();
        }, 50);
      },
      onError: (err) => {
        setError(err.message || "Failed to submit. Try again.");
        setSubmitting(false);
        setIsStreaming(false);
        setQuestionVisible(true);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const progress = question ? (question.sequence_number / MAX_QUESTIONS) * 100 : 0;
  const charCount = answer.trim().length;

  if (error && !question && !isStreaming && !loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "var(--bg)" }}
      >
        <div className="max-w-sm text-center flex flex-col items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <div
              className="text-lg font-semibold mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              Unable to load interview
            </div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {error}
            </div>
          </div>
          <a href="/" className="btn-secondary" id="back-home">
            Return home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-3"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(6,6,15,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <a
            href="/"
            id="nav-home"
            className="flex items-center justify-center px-2.5 py-1 rounded-lg text-white font-bold text-xs flex-shrink-0 tracking-tight"
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)",
              fontFamily: "var(--font-outfit)",
              letterSpacing: "-0.02em",
            }}
            aria-label="resQuotient home"
          >
            resQ
          </a>
          {question && (
            <span
              className="text-xs hidden sm:block"
              style={{ color: "var(--text-secondary)" }}
            >
              Interview in progress
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="text-xs font-mono tabular-nums"
            style={{ color: "var(--text-secondary)" }}
          >
            {formatTime(elapsedSeconds)}
          </div>
          {question && (
            <div
              className="text-xs font-medium px-2.5 py-1 rounded-full tabular-nums"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {question.sequence_number} / {MAX_QUESTIONS}
            </div>
          )}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5" style={{ background: "var(--border)" }}>
        <motion.div
          className="h-full"
          style={{ background: "linear-gradient(90deg, var(--accent), #8b5cf6)" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      <main
        id="main-content"
        className="flex-1 flex items-start justify-center px-6 py-12"
      >
        {loading && !isStreaming ? (
          /* Initial loading — before first chunk arrives */
          <div className="flex items-center justify-center w-full pt-16">
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
              <div
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Generating your first question...
              </div>
              <div
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Retrieving domain knowledge and tailoring to your background
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col gap-5">
            {/* Question card — shows while streaming OR when fully loaded */}
            <AnimatePresence mode="wait">
              <motion.article
                key={question?.id ?? "streaming"}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{
                  opacity: questionVisible || isStreaming ? 1 : 0.4,
                  y: 0,
                  scale: 1,
                }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                className="rounded-2xl p-7 relative overflow-hidden"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 32px rgba(0,0,0,0.3)",
                }}
              >
                {/* Glowing left accent */}
                <div
                  className="absolute left-0 top-6 bottom-6 w-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(180deg, var(--accent), #8b5cf6)",
                  }}
                />

                <div className="flex items-center gap-2.5 mb-4 pl-4">
                  <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: "var(--accent)" }}
                  >
                    {isStreaming
                      ? "Generating..."
                      : `Question ${question?.sequence_number}`}
                  </span>
                  {question?.is_last && !isStreaming && (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        color: "#fbbf24",
                      }}
                    >
                      Final
                    </span>
                  )}
                </div>

                <div
                  className={`pl-4 text-base font-medium leading-relaxed ${
                    isStreaming ? "streaming-cursor" : ""
                  }`}
                  style={{
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {isStreaming ? streamingText : question?.text}
                </div>
              </motion.article>
            </AnimatePresence>

            {/* Answer input — hidden while streaming or submitting */}
            <AnimatePresence>
              {!submitting && !isStreaming && question && (
                <motion.section
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: questionVisible ? 1 : 0, y: questionVisible ? 0 : 8 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex flex-col gap-3"
                  aria-label="Answer input section"
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="answer-input"
                      className="text-xs font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Your answer
                    </label>
                    <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                      Ctrl+Enter to submit
                    </span>
                  </div>

                  <textarea
                    ref={textareaRef}
                    id="answer-input"
                    className="w-full px-4 py-3.5 text-sm leading-relaxed resize-y rounded-xl outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      minHeight: 160,
                    }}
                    placeholder="Type your answer here. Be specific and technical where relevant."
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setError("");
                    }}
                    onKeyDown={handleKeyDown}
                    rows={7}
                    disabled={submitting}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                    aria-describedby={error ? "answer-error" : undefined}
                  />

                  {error && (
                    <motion.div
                      id="answer-error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="alert"
                      className="text-xs px-3.5 py-2.5 rounded-lg"
                      style={{
                        color: "var(--danger)",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.18)",
                      }}
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs tabular-nums"
                      style={{
                        color:
                          charCount < MIN_ANSWER_LENGTH
                            ? "var(--text-secondary)"
                            : "var(--text-dim)",
                      }}
                    >
                      {charCount} characters
                    </span>
                    <motion.button
                      id="submit-answer"
                      className="btn-primary"
                      onClick={handleSubmit}
                      disabled={submitting || charCount < MIN_ANSWER_LENGTH}
                      whileHover={charCount >= MIN_ANSWER_LENGTH ? { scale: 1.02 } : {}}
                      whileTap={charCount >= MIN_ANSWER_LENGTH ? { scale: 0.98 } : {}}
                    >
                      {question?.is_last ? "Submit & View Results" : "Submit Answer"}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </motion.button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Submitting spinner — shows between submit and first streaming chunk */}
            {submitting && !isStreaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-3 py-5 rounded-xl text-sm"
                style={{
                  color: "var(--text-secondary)",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "var(--accent)",
                        animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
                {question?.is_last
                  ? "Compiling your results..."
                  : "Processing answer..."}
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
