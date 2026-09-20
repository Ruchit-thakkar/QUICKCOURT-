"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function OwnerLoginPage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    loadingBusinessProfile,
    hasCompletedOnboarding,
    signInWithEmail,
    signInWithGoogle,
    resetPassword,
    isConfigured,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // If already logged in, redirect based on onboarding completion
  useEffect(() => {
    if (!authLoading && user && !loadingBusinessProfile) {
      if (hasCompletedOnboarding) {
        router.replace("/owner/dashboard");
      } else {
        router.replace("/owner/business-profile/setup");
      }
    }
  }, [user, authLoading, loadingBusinessProfile, hasCompletedOnboarding, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      router.push("/owner/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to sign in. Please verify your credentials.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setResetSuccess(null);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your account email address above to reset password.");
      return;
    }
    setResetSubmitting(true);
    setError(null);
    try {
      await resetPassword(email);
      setResetSuccess("Password reset email sent! Check your inbox.");
      setShowForgotModal(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not send reset email. Verify your email address.");
      }
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-qc-black px-4 py-12 sm:px-6 lg:px-8">
      {/* Background accents */}
      <div className="pointer-events-none absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-qc-lime/5 blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-qc-muted transition hover:text-qc-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to QuickCourt
        </Link>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <span className="font-display text-3xl tracking-wider text-qc-white">
              QUICKCOURT
            </span>
            <span className="ml-2 border border-qc-lime/40 bg-qc-lime/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-qc-lime">
              Owner Portal
            </span>
          </div>
        </div>

        <h1 className="mt-4 font-display text-4xl leading-tight text-qc-white sm:text-5xl">
          Facility Login
        </h1>
        <p className="mt-1 text-sm text-qc-muted">
          Access your court management, slots, and revenue intelligence.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="border border-white/10 bg-qc-charcoal/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          {!isConfigured && (
            <div className="mb-6 border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <p className="font-medium">Firebase credentials needed:</p>
              <p className="mt-1 text-amber-200/80">
                Populate <code className="bg-black/40 px-1 py-0.5">.env.local</code> with your Firebase Project keys to complete live authentication.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-start gap-3 border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="mb-6 flex items-start gap-3 border border-qc-lime/30 bg-qc-lime/10 p-4 text-xs text-qc-lime">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-qc-lime" />
              <span>{resetSuccess}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs uppercase tracking-[0.14em] text-qc-muted"
              >
                Owner Email
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@arena.com"
                  className="w-full border border-white/15 bg-qc-panel px-4 py-3 text-sm text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs uppercase tracking-[0.14em] text-qc-muted"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-qc-lime/80 hover:text-qc-lime hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-white/15 bg-qc-panel px-4 py-3 text-sm text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || googleSubmitting}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
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
            onClick={handleGoogleSignIn}
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
                Continue with Google
              </>
            )}
          </Button>

          <div className="mt-8 border-t border-white/8 pt-5 text-center text-xs text-qc-muted">
            Don&apos;t have an owner account?{" "}
            <Link
              href="/owner/signup"
              className="font-medium text-qc-lime hover:underline"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-white/15 bg-qc-charcoal p-6 shadow-2xl">
            <h3 className="font-display text-2xl text-qc-white">
              Reset Password
            </h3>
            <p className="mt-2 text-xs text-qc-muted">
              Enter your registered owner email address and we&apos;ll send you a password reset link.
            </p>
            <form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@arena.com"
                className="w-full border border-white/15 bg-qc-panel px-3 py-2 text-sm text-qc-white placeholder:text-white/30 focus:border-qc-lime focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={resetSubmitting}
                  size="sm"
                  className="flex-1"
                >
                  {resetSubmitting ? "Sending..." : "Send link"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowForgotModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
