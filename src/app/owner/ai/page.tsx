"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/cn";
import type { AnalyticsTimePeriod } from "@/types";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  ArrowRight,
  TrendingUp,
  Clock,
  Trophy,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  source?: "gemini" | "data_engine";
  timestamp: string;
}

const QUICK_PROMPTS = [
  "What are my peak hours?",
  "Which court is performing best?",
  "Which sport generates the most revenue?",
  "Why are my bookings low this week?",
  "How can I improve weekday bookings?",
  "What happened to my revenue this month?",
];

const PERIOD_OPTIONS: { id: AnalyticsTimePeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7days", label: "7 Days" },
  { id: "30days", label: "30 Days" },
  { id: "thisMonth", label: "This Month" },
];

export default function OwnerAIAssistantPage() {
  const { user, businessProfile } = useAuth();
  const [period, setPeriod] = useState<AnalyticsTimePeriod>("7days");
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `### Summary
Welcome to QuickCourt AI! I have loaded your venue configuration and booking records for ${businessProfile?.businessName || "your sports venue"}.

### Data
- Timeframe active: ${period.toUpperCase()}
- Courts analyzed: ${businessProfile?.courts?.length || 1} courts

### Insight
You can ask me questions about revenue trends, peak slot demand, best performing courts, or how to boost off-peak bookings.

### Recommendation
Click any of the quick prompt chips above or type a specific business question to get started.`,
      source: "data_engine",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const handleSendMessage = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading || !user) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/ai/owner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: q,
          period,
          businessProfile: businessProfile || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to contact QuickCourt AI");
      }

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: data.reply || "No response received from QuickCourt AI.",
        source: data.source || "data_engine",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("AI chat error:", err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: `### Notice
AI is temporarily unavailable. Your QuickCourt data is still safe and accessible in the Analytics tab.

*(Error details: ${err?.message || "Connection failure"})*`,
        source: "data_engine",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: `### Summary
Chat session refreshed. Ready to analyze your sports venue data.

### Insight
Ask any question regarding court utilization, sport revenue, or peak hours.`,
        source: "data_engine",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel>Intelligence & AI</SectionLabel>
          <div className="flex items-center gap-2 mt-2">
            <h1 className="font-display text-4xl text-qc-white md:text-5xl">
              Owner AI Assistant
            </h1>
            <span className="border border-qc-lime/30 bg-qc-lime/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-qc-lime">
              Gemini Powered
            </span>
          </div>
          <p className="mt-1 text-sm text-qc-muted">
            Ask questions about booking trends, court profitability, peak hours, and off-peak strategies.
          </p>
        </div>

        {/* Period Filter Selector */}
        <div className="flex items-center gap-1.5 border border-white/10 bg-qc-charcoal p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPeriod(opt.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition",
                period === opt.id
                  ? "bg-qc-lime text-qc-black"
                  : "text-white/60 hover:text-white"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {/* Quick Prompt Chips */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-muted">
          Suggested Questions
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              className="border border-white/10 bg-qc-charcoal px-3 py-1.5 text-xs text-qc-white hover:border-qc-lime/50 hover:bg-qc-panel transition text-left disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Container */}
      <div className="border border-white/10 bg-qc-charcoal flex flex-col h-[580px]">
        {/* Chat Messages Feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3 max-w-3xl",
                m.sender === "user" ? "ml-auto justify-end" : "justify-start"
              )}
            >
              {m.sender === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-qc-lime/40 bg-qc-lime/10 text-qc-lime">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}

              <div
                className={cn(
                  "p-4 text-xs space-y-3",
                  m.sender === "user"
                    ? "bg-qc-lime text-qc-black font-medium border border-qc-lime"
                    : "bg-qc-panel border border-white/10 text-qc-white w-full"
                )}
              >
                {/* Assistant formatted sections or user text */}
                {m.sender === "user" ? (
                  <p className="text-sm">{m.text}</p>
                ) : (
                  <div className="space-y-3 leading-relaxed">
                    {formatStructuredAIResponse(m.text)}
                  </div>
                )}

                {/* Footer info with timestamp & source */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] opacity-60">
                  <span>{m.timestamp}</span>
                  {m.source && (
                    <span className="uppercase tracking-wider font-mono">
                      {m.source === "gemini" ? "Gemini 2.5 Flash" : "QuickCourt Data Engine"}
                    </span>
                  )}
                </div>
              </div>

              {m.sender === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/20 bg-white/5 text-white">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator Bubble */}
          {loading && (
            <div className="flex gap-3 justify-start max-w-xl">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-qc-lime/40 bg-qc-lime/10 text-qc-lime">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="border border-white/10 bg-qc-panel p-4 text-xs text-qc-white flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-qc-lime" />
                <span className="italic text-qc-muted">
                  QuickCourt AI is analyzing your venue records...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-white/10 bg-qc-panel flex items-center gap-2">
          <button
            onClick={handleResetChat}
            title="Reset conversation"
            className="p-2 text-white/50 hover:text-white border border-white/10 hover:bg-white/5 transition shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask about peak hours, revenue, court occupancy, or promotion tips..."
            disabled={loading}
            className="flex-1 bg-qc-charcoal border border-white/10 px-3 py-2 text-xs text-qc-white placeholder:text-white/30 focus:border-qc-lime focus:outline-none"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputQuery.trim()}
            className="border border-qc-lime bg-qc-lime px-4 py-2 text-xs font-bold uppercase tracking-wider text-qc-black hover:bg-qc-lime/90 disabled:opacity-40 transition flex items-center gap-1.5 shrink-0"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Format markdown structure (### Summary, ### Data, ### Insight, ### Recommendation)
 * into styled QuickCourt cards with badges
 */
function formatStructuredAIResponse(rawText: string) {
  const sections = rawText.split(/(?=### )/);

  if (sections.length <= 1) {
    return <p className="whitespace-pre-wrap">{rawText}</p>;
  }

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("### Summary")) {
          const content = trimmed.replace("### Summary", "").trim();
          return (
            <div key={idx} className="border-l-2 border-qc-lime pl-3 py-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-qc-lime block mb-1">
                Summary
              </span>
              <p className="text-sm font-medium text-qc-white">{content}</p>
            </div>
          );
        }

        if (trimmed.startsWith("### Data")) {
          const content = trimmed.replace("### Data", "").trim();
          return (
            <div key={idx} className="border border-white/10 bg-qc-charcoal p-3 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-qc-muted block mb-1">
                Factual Data
              </span>
              <div className="text-xs text-white/80 whitespace-pre-line font-mono leading-relaxed">
                {content}
              </div>
            </div>
          );
        }

        if (trimmed.startsWith("### Insight")) {
          const content = trimmed.replace("### Insight", "").trim();
          return (
            <div key={idx} className="border border-cyan-500/20 bg-cyan-500/5 p-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                Business Insight
              </span>
              <p className="text-xs text-white/90 leading-relaxed">{content}</p>
            </div>
          );
        }

        if (trimmed.startsWith("### Recommendation")) {
          const content = trimmed.replace("### Recommendation", "").trim();
          return (
            <div key={idx} className="border border-qc-lime/30 bg-qc-lime/5 p-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-qc-lime block mb-1">
                Actionable Recommendation
              </span>
              <div className="text-xs text-qc-white whitespace-pre-line leading-relaxed font-medium">
                {content}
              </div>
            </div>
          );
        }

        return (
          <div key={idx} className="whitespace-pre-line text-xs text-white/80">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}
