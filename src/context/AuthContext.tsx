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
import { getPlayerProfile, updatePlayerProfile } from "@/services/playerService";
import type { OwnerUser, BusinessProfile, UserRole, PlayerProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  ownerProfile: OwnerUser | null;
  businessProfile: BusinessProfile | null;
  playerProfile: PlayerProfile | null;
  hasCompletedOnboarding: boolean;
  loading: boolean;
  loadingBusinessProfile: boolean;
  loadingPlayerProfile: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  signUpPlayerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInPlayerWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBusinessProfile: () => Promise<BusinessProfile | null>;
  refreshPlayerProfile: () => Promise<PlayerProfile | null>;
  updatePlayer: (data: Partial<PlayerProfile>) => Promise<void>;
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
  const [role, setRole] = useState<UserRole | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerUser | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBusinessProfile, setLoadingBusinessProfile] = useState(true);
  const [loadingPlayerProfile, setLoadingPlayerProfile] = useState(true);
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

  const fetchPlayerProfile = useCallback(async (uid: string): Promise<PlayerProfile | null> => {
    setLoadingPlayerProfile(true);
    try {
      const profile = await getPlayerProfile(uid);
      setPlayerProfile(profile);
      return profile;
    } catch (err) {
      console.warn("Error checking player profile:", err);
      return null;
    } finally {
      setLoadingPlayerProfile(false);
    }
  }, []);

  const refreshBusinessProfile = useCallback(async () => {
    if (!user) {
      setBusinessProfile(null);
      return null;
    }
    return await fetchBusinessProfile(user.uid);
  }, [user, fetchBusinessProfile]);

  const refreshPlayerProfile = useCallback(async () => {
    if (!user) {
      setPlayerProfile(null);
      return null;
    }
    return await fetchPlayerProfile(user.uid);
  }, [user, fetchPlayerProfile]);

  const syncUserDoc = useCallback(
    async (
      firebaseUser: User,
      authProvider: "password" | "google",
      displayNameFallback?: string,
      intendedRole?: UserRole
    ) => {
      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snapshot = await getDoc(userRef);

        const name =
          displayNameFallback ||
          firebaseUser.displayName ||
          snapshot.data()?.name ||
          (intendedRole === "player" ? "Player" : "Facility Owner");

        const photo = firebaseUser.photoURL || snapshot.data()?.photoURL || "";

        let userRole: UserRole = "owner";
        if (!snapshot.exists()) {
          userRole = intendedRole || "owner";
          const newProfile: any = {
            uid: firebaseUser.uid,
            name,
            email: firebaseUser.email || "",
            photoURL: photo,
            role: userRole,
            authProvider,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          setRole(userRole);

          if (userRole === "owner") {
            setOwnerProfile(newProfile);
            await fetchBusinessProfile(firebaseUser.uid);
          } else if (userRole === "player") {
            await updatePlayerProfile(firebaseUser.uid, {
              name,
              email: firebaseUser.email || "",
              profileImage: photo,
              favoriteSports: [],
            });
            await fetchPlayerProfile(firebaseUser.uid);
          }
        } else {
          await updateDoc(userRef, {
            updatedAt: serverTimestamp(),
          });
          const data = snapshot.data();
          userRole = (data.role as UserRole) || "owner";
          setRole(userRole);
          if (userRole === "owner") {
            setOwnerProfile({
              uid: firebaseUser.uid,
              name: data.name || name,
              email: firebaseUser.email || data.email || "",
              photoURL: data.photoURL || photo,
              role: userRole,
              authProvider: data.authProvider || authProvider,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
            await fetchBusinessProfile(firebaseUser.uid);
          } else if (userRole === "player") {
            await fetchPlayerProfile(firebaseUser.uid);
          }
        }
      } catch (firestoreError) {
        console.warn("Firestore user sync warning:", firestoreError);
      }
    },
    [fetchBusinessProfile, fetchPlayerProfile]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const providerId = currentUser.providerData?.[0]?.providerId;
        const provider: "password" | "google" =
          providerId === "google.com" ? "google" : "password";
        await syncUserDoc(currentUser, provider);
      } else {
        setRole(null);
        setOwnerProfile(null);
        setBusinessProfile(null);
        setPlayerProfile(null);
        setLoadingBusinessProfile(false);
        setLoadingPlayerProfile(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserDoc]);

  const signInWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await syncUserDoc(cred.user, "password");
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
      await syncUserDoc(cred.user, "password", name.trim(), "owner");
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const signUpPlayerWithEmail = async (
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
      await syncUserDoc(cred.user, "password", name.trim(), "player");
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
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const signInPlayerWithGoogle = async () => {
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncUserDoc(cred.user, "google", undefined, "player");
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const updatePlayer = async (data: Partial<PlayerProfile>) => {
    if (!user) throw new Error("User must be authenticated to update player profile");
    setError(null);
    try {
      await updatePlayerProfile(user.uid, data);
      await fetchPlayerProfile(user.uid);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setError(msg);
      throw new Error(msg);
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
      setRole(null);
      setOwnerProfile(null);
      setBusinessProfile(null);
      setPlayerProfile(null);
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
        role,
        ownerProfile,
        businessProfile,
        playerProfile,
        hasCompletedOnboarding,
        loading,
        loadingBusinessProfile,
        loadingPlayerProfile,
        error,
        isConfigured: isFirebaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signUpPlayerWithEmail,
        signInWithGoogle,
        signInPlayerWithGoogle,
        resetPassword,
        logout,
        refreshBusinessProfile,
        refreshPlayerProfile,
        updatePlayer,
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

