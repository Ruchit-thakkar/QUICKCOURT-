"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Save,
  Loader2,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

const AVAILABLE_SPORTS = [
  "Cricket",
  "Football",
  "Badminton",
  "Tennis",
  "Basketball",
  "Pickleball",
  "Volleyball",
  "Box Cricket",
  "Table Tennis",
  "Swimming",
];

export default function PlayerProfilePage() {
  const router = useRouter();
  const { user, playerProfile, loading, loadingPlayerProfile, updatePlayer, logout } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [favoriteSports, setFavoriteSports] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playerProfile) {
      setName(playerProfile.name || user?.displayName || "");
      setPhone(playerProfile.phone || "");
      setFavoriteSports(playerProfile.favoriteSports || []);
    } else if (user) {
      setName(user.displayName || "");
    }
  }, [playerProfile, user]);

  const toggleSport = (sport: string) => {
    setFavoriteSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedSuccess(false);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSaving(true);
    try {
      await updatePlayer({
        name: name.trim(),
        phone: phone.trim(),
        favoriteSports,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || (user && loadingPlayerProfile)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-qc-lime" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-qc-charcoal border border-white/15">
          <User className="h-6 w-6 text-qc-lime" />
        </div>
        <h1 className="font-display text-3xl text-qc-white">Player Account Required</h1>
        <p className="mt-2 text-xs text-qc-muted">
          Log in or create a player profile to manage your contact info and favorite sports.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/player/login" size="md">
            Sign In
          </Button>
          <Button href="/player/signup" variant="secondary" size="md">
            Join QuickCourt
          </Button>
        </div>
      </div>
    );
  }

  const joinDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "Active Member";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl text-qc-white">
            Player Profile
          </h1>
          <p className="mt-1 text-xs text-qc-muted">
            Manage your personal sports profile and preferences
          </p>
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 self-start border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Summary Card */}
        <div className="border border-white/10 bg-qc-panel p-6 h-fit">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-qc-lime/20 border border-qc-lime/40 text-qc-lime font-display text-3xl">
              {(name || "P")[0].toUpperCase()}
            </div>
            <h2 className="mt-4 font-display text-2xl text-qc-white">{name || "Player"}</h2>
            <p className="text-xs text-qc-muted">{user.email}</p>

            <span className="mt-3 inline-flex items-center gap-1 border border-qc-lime/30 bg-qc-lime/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-qc-lime">
              Verified Player
            </span>
          </div>

          <div className="mt-6 pt-6 border-t border-white/8 space-y-3 text-xs text-qc-muted">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-white/40" />
                Joined
              </span>
              <span className="text-qc-white">{joinDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-white/40" />
                Player ID
              </span>
              <span className="font-mono text-[10px] text-white/60">
                {user.uid.slice(0, 10)}...
              </span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/8">
            <a
              href="/owner/login"
              className="flex items-center justify-center gap-1.5 w-full border border-white/10 bg-qc-charcoal p-2.5 text-xs text-white/60 hover:text-qc-lime hover:border-qc-lime/30 transition text-center"
            >
              <Building2 className="h-3.5 w-3.5" />
              Facility Owner Login →
            </a>
          </div>
        </div>

        {/* Right Side: Editable Details Form */}
        <div className="lg:col-span-2 border border-white/10 bg-qc-panel p-6 sm:p-8">
          <form onSubmit={handleSave} className="space-y-6">
            {savedSuccess && (
              <div className="flex items-center gap-2 border border-qc-lime/30 bg-qc-lime/10 p-3 text-xs text-qc-lime">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Profile updated successfully!
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-qc-muted mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                  className="w-full border border-white/15 bg-qc-charcoal pl-10 pr-4 py-2.5 text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-qc-muted mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="w-full border border-white/10 bg-qc-black/40 pl-10 pr-4 py-2.5 text-sm text-white/50 cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-[11px] text-white/40">
                Email is linked to your authentication account.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-qc-muted mb-2">
                Mobile Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full border border-white/15 bg-qc-charcoal pl-10 pr-4 py-2.5 text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-white/40">
                Used for instant venue updates and communication.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-qc-muted mb-2">
                Favorite Sports
              </label>
              <p className="text-xs text-qc-muted mb-3">
                Select the sports you love playing:
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SPORTS.map((sport) => {
                  const isSelected = favoriteSports.includes(sport);
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => toggleSport(sport)}
                      className={`border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition ${
                        isSelected
                          ? "border-qc-lime bg-qc-lime/15 text-qc-lime font-bold"
                          : "border-white/10 bg-qc-charcoal text-white/70 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {sport} {isSelected && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-white/8 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-qc-lime px-6 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-qc-black transition hover:bg-qc-lime/90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
