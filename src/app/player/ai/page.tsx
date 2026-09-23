"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { subscribePlayerBookings } from "@/services/bookingService";
import { calculatePlayerActivity } from "@/services/analyticsService";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import { db } from "@/lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import type { OwnerBooking, BusinessProfile } from "@/types";
import {
  Sparkles,
  Send,
  Loader2,
  Trophy,
  User,
  Compass,
  MapPin,
  CalendarCheck,
  IndianRupee,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  source?: "gemini" | "data_engine";
  timestamp: string;
}

const PLAYER_QUICK_PROMPTS = [
  "My activity this month",
  "My favorite sport",
  "My spending",
  "Find nearby cricket grounds",
  "My recent bookings summary",
];

export default function PlayerAIAssistantPage() {
  const { user, playerProfile } = useAuth();
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [discoverVenues, setDiscoverVenues] = useState<any[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Subscribe to player's bookings
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribePlayerBookings(
      user.uid,
      (data) => setBookings(data),
      (err) => console.error("Player AI load bookings error:", err)
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch sample discoverable venues
  useEffect(() => {
    const q = query(collection(db, "businesses"), limit(4));
    getDocs(q).then((snap) => {
      const items: any[] = [];
      snap.forEach((d) => {
        const b = d.data() as BusinessProfile;
        const minPrice = (b.courts || []).reduce(
          (min, c) => (c.pricePerHour < min ? c.pricePerHour : min),
          800
        );
        items.push({
          id: d.id,
          name: b.businessName || "Sports Venue",
          city: b.location?.city || "Local City",
          categories: b.categories || ["Cricket"],
          priceFrom: minPrice,
        });
      });
      setDiscoverVenues(items);
    });
  }, []);

  const activity = useMemo(() => {
    return calculatePlayerActivity(bookings);
  }, [bookings]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `Hello ${user?.displayName || "Player"}! I am your QuickCourt Sports Concierge.

I have synchronized your sports activity records. You can ask me about:
- Your monthly games & fitness investment
- Your most played sports disciplines
- Finding nearby sports grounds and venues

How can I help you play today?`,
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
      const res = await fetch("/api/ai/player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to contact Player AI");
      }

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: data.reply || "No response received from Player AI.",
        source: data.source || "data_engine",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Player AI chat error:", err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: `### Notice
Player AI is temporarily unavailable. Your sports history and bookings are still safe and accessible in the Activity tab.

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
        text: `Chat refreshed! What would you like to know about your matches or nearby venues?`,
        source: "data_engine",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Recommended Venue matching favorite sport
  const recommendedVenue = useMemo(() => {
    if (!activity.favoriteSport || discoverVenues.length === 0) {
      return discoverVenues[0] || null;
    }
    const matching = discoverVenues.find((v) =>
      v.categories.some((c: string) =>
        c.toLowerCase().includes(activity.favoriteSport?.toLowerCase() || "")
      )
    );
    return matching || discoverVenues[0] || null;
  }, [activity.favoriteSport, discoverVenues]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-20">
      {/* Header */}
      <header className="border-b border-white/8 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <SectionLabel>Player AI Assistant</SectionLabel>
          <div className="flex items-center gap-2 mt-2">
            <h1 className="font-display text-3xl sm:text-5xl text-qc-white">
              Sports Concierge
            </h1>
            <span className="border border-qc-lime/40 bg-qc-lime/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-qc-lime">
              Gemini Powered
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-qc-muted">
            Ask about your playing streak, monthly spending, or discover top sports arenas.
          </p>
        </div>

        <Link
          href="/player/activity"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-qc-lime hover:underline font-semibold self-start sm:self-auto"
        >
          <span>View Activity Stats</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Personalized Recommendation Banner based on real player signals */}
      {recommendedVenue && (
        <div className="border border-qc-lime/30 bg-qc-charcoal p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-qc-lime/40 bg-qc-lime/10 text-qc-lime">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-qc-lime block">
                {activity.favoriteSport
                  ? `Because you frequently book ${activity.favoriteSport}`
                  : "Recommended Sports Venue"}
              </span>
              <p className="text-sm font-semibold text-qc-white mt-0.5">
                {recommendedVenue.name} • {recommendedVenue.city}
              </p>
              <p className="text-xs text-qc-muted mt-0.5">
                Sports: {recommendedVenue.categories.join(", ")} • From {formatINR(recommendedVenue.priceFrom)}/hour
              </p>
            </div>
          </div>

          <Link
            href={`/player/venue/${recommendedVenue.id}`}
            className="inline-flex items-center gap-2 border border-qc-lime bg-qc-lime px-4 py-2 text-xs font-bold uppercase tracking-wider text-qc-black hover:bg-qc-lime/90 transition shrink-0 self-start sm:self-auto"
          >
            <Compass className="h-3.5 w-3.5" />
            Book Court
          </Link>
        </div>
      )}

      {/* Quick Prompts Chips */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-muted">
          Quick Prompts
        </p>
        <div className="flex flex-wrap gap-2">
          {PLAYER_QUICK_PROMPTS.map((prompt) => (
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
      <div className="border border-white/10 bg-qc-charcoal flex flex-col h-[520px]">
        {/* Messages feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3 max-w-2xl",
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
                  "p-4 text-xs space-y-2",
                  m.sender === "user"
                    ? "bg-qc-lime text-qc-black font-medium border border-qc-lime"
                    : "bg-qc-panel border border-white/10 text-qc-white w-full"
                )}
              >
                <div className="whitespace-pre-line leading-relaxed text-xs">
                  {m.text}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] opacity-60">
                  <span>{m.timestamp}</span>
                  {m.source && (
                    <span className="uppercase tracking-wider font-mono">
                      {m.source === "gemini" ? "Gemini 2.5 Flash" : "QuickCourt AI"}
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

          {loading && (
            <div className="flex gap-3 justify-start max-w-lg">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-qc-lime/40 bg-qc-lime/10 text-qc-lime">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="border border-white/10 bg-qc-panel p-4 text-xs text-qc-white flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-qc-lime" />
                <span className="italic text-qc-muted">
                  QuickCourt AI is checking your match records...
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
            placeholder="Ask about your spending, favorite sports, or grounds to book..."
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
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
