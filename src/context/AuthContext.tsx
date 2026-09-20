"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { getBusinessProfileByOwnerId } from "@/services/businessService";
import type { OwnerUser, BusinessProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  ownerProfile: OwnerUser | null;
  businessProfile: BusinessProfile | null;
  hasCompletedOnboarding: boolean;
  loading: boolean;
  loadingBusinessProfile: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBusinessProfile: () => Promise<BusinessProfile | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getFriendlyErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "An unexpected error occurred.";
  const code = "code" in err ? String((err as { code: unknown }).code) : "";
  const msg = "message" in err ? String((err as { message: unknown }).message) : "";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please verify your details.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please log in.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled before completion.";
    case "auth/cancelled-popup-request":
      return "Authentication popup cancelled.";
    case "auth/popup-blocked":
      return "Popup was blocked by your browser. Please allow popups for Google sign-in.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment before trying again.";
    case "auth/operation-not-allowed":
      return "Email/Password or Google sign-in is not enabled in Firebase Console yet.";
    default:
      if (!isFirebaseConfigured) {
        return "Firebase credentials not yet provided in .env.local. Please configure NEXT_PUBLIC_FIREBASE_* variables.";
      }
      return msg || "An error occurred during authentication.";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerUser | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBusinessProfile, setLoadingBusinessProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessProfile = useCallback(async (uid: string): Promise<BusinessProfile | null> => {
    setLoadingBusinessProfile(true);
    try {
      const biz = await getBusinessProfileByOwnerId(uid);
      setBusinessProfile(biz);
      return biz;
    } catch (err) {
      console.warn("Error checking business profile:", err);
      return null;
    } finally {
      setLoadingBusinessProfile(false);
    }
  }, []);

  const refreshBusinessProfile = useCallback(async () => {
    if (!user) {
      setBusinessProfile(null);
      return null;
    }
    return await fetchBusinessProfile(user.uid);
  }, [user, fetchBusinessProfile]);

  const syncUserDoc = useCallback(
    async (
      firebaseUser: User,
      authProvider: "password" | "google",
      displayNameFallback?: string
    ) => {
      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snapshot = await getDoc(userRef);

        const name =
          displayNameFallback ||
          firebaseUser.displayName ||
          snapshot.data()?.name ||
          "Facility Owner";

        const photo = firebaseUser.photoURL || snapshot.data()?.photoURL || "";

        if (!snapshot.exists()) {
          const newProfile: OwnerUser = {
            uid: firebaseUser.uid,
            name,
            email: firebaseUser.email || "",
            photoURL: photo,
            role: "owner",
            authProvider,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          setOwnerProfile(newProfile);
        } else {
          await updateDoc(userRef, {
            updatedAt: serverTimestamp(),
          });
          const data = snapshot.data();
          setOwnerProfile({
            uid: firebaseUser.uid,
            name: data.name || name,
            email: firebaseUser.email || data.email || "",
            photoURL: data.photoURL || photo,
            role: data.role || "owner",
            authProvider: data.authProvider || authProvider,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        }
      } catch (firestoreError) {
        console.warn("Firestore user sync warning:", firestoreError);
        setOwnerProfile({
          uid: firebaseUser.uid,
          name: displayNameFallback || firebaseUser.displayName || "Facility Owner",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "",
          role: "owner",
          authProvider,
        });
      }
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const providerId = currentUser.providerData?.[0]?.providerId;
        const provider: "password" | "google" =
          providerId === "google.com" ? "google" : "password";
        await syncUserDoc(currentUser, provider);
        await fetchBusinessProfile(currentUser.uid);
      } else {
        setOwnerProfile(null);
        setBusinessProfile(null);
        setLoadingBusinessProfile(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserDoc, fetchBusinessProfile]);

  const signInWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await syncUserDoc(cred.user, "password");
      await fetchBusinessProfile(cred.user.uid);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const signUpWithEmail = async (
    name: string,
    email: string,
    pass: string
  ) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch {
          // Non-blocking
        }
      }
      await syncUserDoc(cred.user, "password", name.trim());
      await fetchBusinessProfile(cred.user.uid);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncUserDoc(cred.user, "google");
      await fetchBusinessProfile(cred.user.uid);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setOwnerProfile(null);
      setBusinessProfile(null);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const clearError = () => setError(null);

  const hasCompletedOnboarding = Boolean(
    businessProfile && businessProfile.onboardingCompleted === true
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        ownerProfile,
        businessProfile,
        hasCompletedOnboarding,
        loading,
        loadingBusinessProfile,
        error,
        isConfigured: isFirebaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        logout,
        refreshBusinessProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
