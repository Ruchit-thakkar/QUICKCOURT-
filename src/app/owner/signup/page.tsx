"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, AlertCircle, Loader2, Check } from "lucide-react";

export default function OwnerSignupPage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    loadingBusinessProfile,
    hasCompletedOnboarding,
    signUpWithEmail,
    signInWithGoogle,
    isConfigured,
  } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect based on onboarding completion
  useEffect(() => {
    if (!authLoading && user && !loadingBusinessProfile) {
      if (hasCompletedOnboarding) {
        router.replace("/owner/dashboard");
      } else {
        router.replace("/owner/business-profile/setup");
      }
    }
  }, [user, authLoading, loadingBusinessProfile, hasCompletedOnboarding, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name or facility contact name.");
      return;
    }
    if (!email.trim()) {
      setError("Please provide a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both password fields.");
      return;
    }

    setSubmitting(true);
    try {
      await signUpWithEmail(name, email, password);
      router.push("/owner/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Account creation failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      router.push("/owner/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Google sign-in was interrupted. Please try again.");
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-qc-black px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute right-1/4 top-10 h-80 w-80 rounded-full bg-qc-lime/5 blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-qc-muted transition hover:text-qc-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to QuickCourt
        </Link>

        <div className="mt-6 flex items-center">
          <span className="font-display text-3xl tracking-wider text-qc-white">
            QUICKCOURT
          </span>
          <span className="ml-2 border border-qc-lime/40 bg-qc-lime/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-qc-lime">
            Owner Registration
          </span>
        </div>

        <h1 className="mt-4 font-display text-4xl leading-tight text-qc-white sm:text-5xl">
          Create Owner Account
        </h1>
        <p className="mt-1 text-sm text-qc-muted">
          List your venue, manage slots, and join the QuickFill revenue network.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="border border-white/10 bg-qc-charcoal/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          {!isConfigured && (
            <div className="mb-6 border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <p className="font-medium">Firebase credentials needed:</p>
              <p className="mt-1 text-amber-200/80">
                Populate <code className="bg-black/40 px-1 py-0.5">.env.local</code> with your Firebase Project keys to complete live registration.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-start gap-3 border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-xs uppercase tracking-[0.14em] text-qc-muted"
              >
                Full Name / Contact Name
              </label>
              <div className="mt-1.5">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ruchit Thakkar"
                  className="w-full border border-white/15 bg-qc-panel px-4 py-2.5 text-sm text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs uppercase tracking-[0.14em] text-qc-muted"
              >
                Business Email
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@arena.com"
                  className="w-full border border-white/15 bg-qc-panel px-4 py-2.5 text-sm text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs uppercase tracking-[0.14em] text-qc-muted"
              >
                Password (min. 6 characters)
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-white/15 bg-qc-panel px-4 py-2.5 text-sm text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs uppercase tracking-[0.14em] text-qc-muted"
              >
                Confirm Password
              </label>
              <div className="mt-1.5">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-white/15 bg-qc-panel px-4 py-2.5 text-sm text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting || googleSubmitting}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Owner Account"
                )}
              </Button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
              <span className="bg-qc-charcoal px-3 text-qc-muted">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleGoogleSignup}
            disabled={submitting || googleSubmitting}
            className="w-full"
            size="lg"
          >
            {googleSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting to Google...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.55 0 2.94.54 4.04 1.57l3.03-3.03C17.24 1.83 14.8 1 12 1 7.39 1 3.51 3.65 1.62 7.51l3.66 2.84C6.15 7.42 8.84 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.69 2.86c2.16-1.99 3.41-4.91 3.41-8.68z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.65c-.24-.71-.38-1.47-.38-2.25 0-.78.14-1.54.38-2.25L1.62 7.51C.59 9.58 0 11.91 0 12.4s.59 2.82 1.62 4.89l3.66-2.64z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.69-2.86c-1.07.72-2.45 1.16-4.24 1.16-3.16 0-5.85-2.42-6.72-5.35L1.62 15.89C3.51 19.75 7.39 23 12 23z"
                  />
                </svg>
                Sign up with Google
              </>
            )}
          </Button>

          <div className="mt-6 space-y-2 border-t border-white/8 pt-4 text-xs text-qc-muted">
            <p className="flex items-center gap-2 text-[11px] text-qc-muted/70">
              <Check className="h-3.5 w-3.5 text-qc-lime" />
              Owner role automatically assigned in Firestore
            </p>
            <p className="flex items-center gap-2 text-[11px] text-qc-muted/70">
              <Check className="h-3.5 w-3.5 text-qc-lime" />
              Zero passwords stored in database
            </p>
          </div>

          <div className="mt-6 border-t border-white/8 pt-5 text-center text-xs text-qc-muted">
            Already have an owner account?{" "}
            <Link
              href="/owner/login"
              className="font-medium text-qc-lime hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
