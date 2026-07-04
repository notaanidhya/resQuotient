"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onFile: (file: File) => void;
  file: File | null;
  disabled?: boolean;
}

const MAX_SIZE_MB = 10;
const WARN_SIZE_MB = 5;
const ACCEPTED_TYPES = ["application/pdf", "text/plain"];
const ACCEPTED_EXTS = [".pdf", ".txt"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ type }: { type: string }) {
  const isPdf = type === "application/pdf";
  return (
    <div
      className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
      style={{
        background: isPdf ? "rgba(239,68,68,0.1)" : "rgba(92,110,248,0.1)",
        border: `1px solid ${isPdf ? "rgba(239,68,68,0.2)" : "rgba(92,110,248,0.2)"}`,
      }}
    >
      {isPdf ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.7">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8898fc" strokeWidth="1.7">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="11" y2="17" />
        </svg>
      )}
    </div>
  );
}

export default function ResumeUpload({ onFile, file, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const simulateProgress = useCallback(() => {
    setUploadProgress(0);
    setUploaded(false);
    let prog = 0;
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      prog += Math.random() * 18 + 8;
      if (prog >= 100) {
        prog = 100;
        clearInterval(progressTimer.current!);
        setUploadProgress(100);
        setTimeout(() => setUploaded(true), 300);
      }
      setUploadProgress(Math.min(prog, 100));
    }, 80);
  }, []);

  const validateAndAccept = useCallback(
    (f: File) => {
      setValidationError("");
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      const isValidType = ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXTS.includes(ext);
      if (!isValidType) {
        setValidationError("Only PDF and plain text (.txt) files are accepted.");
        return;
      }
      const sizeMB = f.size / (1024 * 1024);
      if (sizeMB > MAX_SIZE_MB) {
        setValidationError(`File is too large (${formatSize(f.size)}). Maximum is ${MAX_SIZE_MB} MB.`);
        return;
      }
      simulateProgress();
      onFile(f);
    },
    [onFile, simulateProgress]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) validateAndAccept(dropped);
    },
    [validateAndAccept, disabled]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndAccept(e.target.files[0]);
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const sizeMB = file ? file.size / (1024 * 1024) : 0;
  const isLarge = sizeMB > WARN_SIZE_MB && sizeMB <= MAX_SIZE_MB;

  return (
    <div className="flex flex-col gap-2">
      <motion.div
        onClick={handleClick}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        animate={{
          borderColor: dragging
            ? "var(--accent)"
            : file
            ? "rgba(34,197,94,0.4)"
            : "var(--border)",
          boxShadow: dragging
            ? "0 0 24px rgba(92,110,248,0.15)"
            : file
            ? "0 0 20px rgba(34,197,94,0.08)"
            : "none",
        }}
        transition={{ duration: 0.2 }}
        className="relative flex flex-col items-center justify-center rounded-xl cursor-pointer overflow-hidden transition-colors select-none"
        style={{
          minHeight: 130,
          background: dragging
            ? "rgba(92,110,248,0.05)"
            : file
            ? "rgba(34,197,94,0.04)"
            : "rgba(255,255,255,0.02)",
          border: "1.5px dashed var(--border)",
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Resume upload area"
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          id="resume-upload"
          aria-label="Upload resume file"
        />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-4 px-5 py-4 w-full"
            >
              <FileTypeIcon type={file.type} />
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate mb-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {file.name}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {formatSize(file.size)}
                  </span>
                  {isLarge && (
                    <span className="text-xs" style={{ color: "var(--warning)" }}>
                      · Large file
                    </span>
                  )}
                  {uploaded && (
                    <span className="text-xs" style={{ color: "var(--success)" }}>
                      · Ready
                    </span>
                  )}
                </div>
              </div>
              {uploaded ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "var(--success-dim)", border: "1px solid var(--success-border)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
              ) : (
                <div
                  className="flex-shrink-0 text-xs px-2 py-1 rounded"
                  style={{ color: "var(--text-dim)", background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  Change
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 px-6 py-6 text-center"
            >
              <motion.div
                animate={dragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(92,110,248,0.08)", border: "1px solid rgba(92,110,248,0.15)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </motion.div>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {dragging ? "Drop it here" : "Drop your resume or click to browse"}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  PDF or plain text · up to {MAX_SIZE_MB} MB
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        {file && uploadProgress < 100 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ background: "var(--border)" }}
          >
            <motion.div
              className="h-full"
              style={{ background: "linear-gradient(90deg, var(--accent), #8b5cf6)" }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Validation error */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            role="alert"
            className="flex items-center gap-2 text-xs px-3.5 py-2.5 rounded-lg"
            style={{
              color: "var(--danger)",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {validationError}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
