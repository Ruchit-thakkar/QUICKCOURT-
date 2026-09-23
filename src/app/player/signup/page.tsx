"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Loader2, AlertCircle, Building2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function PlayerSignupPage() {
  const router = useRouter();
  const { user, signUpPlayerWithEmail, signInPlayerWithGoogle, loading, error, clearError } =
    useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // If already logged in, route to /player
  useEffect(() => {
    if (!loading && user) {
      router.replace("/player");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!name.trim()) {
      setLocalError("Please enter your name.");
      return;
    }
    if (!email.trim() || !password) {
      setLocalError("Please enter email and password.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await signUpPlayerWithEmail(name.trim(), email.trim(), password);
      router.push("/player");
    } catch (err: any) {
      setLocalError(err?.message || "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLocalError(null);
    clearError();
    setSubmitting(true);
    try {
      await signInPlayerWithGoogle();
      router.push("/player");
    } catch (err: any) {
      setLocalError(err?.message || "Google sign-in cancelled or failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 bg-qc-black">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/player" className="flex items-center gap-2 group">
            <div className="flex h-12 w-12 items-center justify-center border border-qc-lime/40 bg-qc-charcoal group-hover:border-qc-lime transition">
              <span className="font-display text-2xl tracking-wider text-qc-lime">QC</span>
            </div>
          </Link>
        </div>
        <h1 className="mt-4 text-center font-display text-3xl sm:text-4xl tracking-tight text-qc-white">
          Create Player Account
        </h1>
        <p className="mt-1 text-center text-xs text-qc-muted uppercase tracking-widest">
          Find Courts, Discover Venues & Connect With Games
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="border border-white/10 bg-qc-panel p-6 sm:p-8 shadow-2xl">
          {(localError || error) && (
            <div className="mb-6 flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Google Single Sign-On */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-3 border border-white/15 bg-qc-charcoal px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-qc-white transition hover:border-white/30 hover:bg-white/5 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.54 0 2.93.56 4.02 1.48l3.01-3.01C17.21 1.79 14.77 1 12 1 7.48 1 3.66 3.61 1.84 7.39l3.62 2.81C6.33 7.31 8.92 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.71 2.88c2.16-1.99 3.71-4.93 3.71-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.46 14.8c-.23-.68-.36-1.41-.36-2.16s.13-1.48.36-2.16L1.84 7.67C1.07 9.21.64 10.94.64 12.76s.43 3.55 1.2 5.09l3.62-3.05z"
              />
              <path
                fill="#34A853"
                d="M12 23.5c3.24 0 5.95-1.08 7.93-2.91l-3.71-2.88c-1.07.72-2.45 1.16-4.22 1.16-3.08 0-5.67-2.31-6.54-5.2L1.84 16.71C3.66 20.49 7.48 23.5 12 23.5z"
              />
            </svg>
            Sign up with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-qc-panel px-2 text-qc-muted">Or with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-qc-muted mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full border border-white/15 bg-qc-charcoal pl-9 pr-3 py-2 text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-qc-muted mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="player@example.com"
                  className="w-full border border-white/15 bg-qc-charcoal pl-9 pr-3 py-2 text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-qc-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 6 characters"
                  className="w-full border border-white/15 bg-qc-charcoal pl-9 pr-3 py-2 text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 bg-qc-lime py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-qc-black transition hover:bg-qc-lime/90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Player Account"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/8 text-center">
            <p className="text-xs text-qc-muted">
              Already have an account?{" "}
              <Link href="/player/login" className="text-qc-lime hover:underline font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Switch to Venue Owner Registration */}
        <div className="mt-6 text-center">
          <Link
            href="/owner/signup"
            className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-qc-lime transition"
          >
            <Building2 className="h-3.5 w-3.5" />
            Looking to list your sports ground? Register as Venue Owner →
          </Link>
        </div>
      </div>
    </div>
  );
}
