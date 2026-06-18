"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Loader2 } from "lucide-react";


interface AiSummaryProps {
  orderId: string;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  issueCategory?: string | null;
  problem: string;
  initialSummary?: string | null;
}

export default function AiSummary({ 
  orderId, 
  deviceType, 
  brand, 
  model, 
  issueCategory, 
  problem,
  initialSummary 
}: AiSummaryProps) {
  const [summary, setSummary] = useState<string | null>(initialSummary || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/summarize-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: orderId,
          deviceType,
          brand,
          model,
          issueCategory,
          problem
        })
      });

      const data = await res.json();
      if (data.ok && data.summary) {
        setSummary(data.summary);
      } else {
        setError(data.message || "Failed to generate summary");
      }
    } catch (err) {
      setError("An error occurred while connecting to the AI service");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!summary && !isGenerating && !error) {
    return (
      <button 
        onClick={generateSummary}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--mint-200)] bg-[var(--mint-50)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-100)] dark:border-[var(--mint-900)] dark:bg-[var(--mint-950)] dark:text-[var(--mint-400)]"
      >
        <Sparkles size={14} />
        Generate AI Summary
      </button>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-dark)]">
          <Sparkles size={14} className="text-[var(--primary)]" />
          AI Issue Summary
        </div>
      </div>
      <div className="p-4 text-sm text-[var(--foreground)]">
        {isGenerating ? (
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <Loader2 size={16} className="animate-spin" />
            Analyzing description...
          </div>
        ) : error ? (
          <div className="text-red-500">
            {error}
            <button 
              onClick={generateSummary}
              className="ml-2 text-[var(--accent-dark)] underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{summary || ""}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
