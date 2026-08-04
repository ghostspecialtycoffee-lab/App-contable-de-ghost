"use client";

import type { Organization, UserProfile } from "@ghost/domain";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { firestorePaths, mapOrganization, mapUserProfile } from "@ghost/infrastructure";
import type { FirestoreOrganization, FirestoreUserProfile } from "@ghost/infrastructure";
import { getDoc } from "firebase/firestore";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  isConfigured: boolean;
  refreshOrganization: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseConfigured();

  const loadOrganization = useCallback(async (userProfile: UserProfile | null) => {
    if (!userProfile) {
      setOrganization(null);
      return;
    }

    const activeMembership = userProfile.memberships.find(
      (membership) => membership.isActive,
    );

    if (!activeMembership) {
      setOrganization(null);
      return;
    }

    const organizationRef = doc(
      getFirestoreDb(),
      firestorePaths.organization(activeMembership.organizationId),
    );
    const snapshot = await getDoc(organizationRef);

    if (!snapshot.exists()) {
      setOrganization(null);
      return;
    }

    setOrganization(
      mapOrganization(
        snapshot.id,
        snapshot.data() as FirestoreOrganization,
      ),
    );
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setOrganization(null);
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, [isConfigured]);

  useEffect(() => {
    if (!firebaseUser || !isConfigured) {
      return;
    }

    setLoading(true);

    const userRef = doc(getFirestoreDb(), firestorePaths.user(firebaseUser.uid));

    const unsubscribeProfile = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setProfile(null);
          setOrganization(null);
          setLoading(false);
          return;
        }

        const mappedProfile = mapUserProfile(
          snapshot.id,
          snapshot.data() as FirestoreUserProfile,
        );
        setProfile(mappedProfile);
        void loadOrganization(mappedProfile).finally(() => setLoading(false));
      },
      () => {
        setProfile(null);
        setOrganization(null);
        setLoading(false);
      },
    );

    return unsubscribeProfile;
  }, [firebaseUser, isConfigured, loadOrganization]);

  const refreshOrganization = useCallback(async () => {
    await loadOrganization(profile);
  }, [loadOrganization, profile]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
    setProfile(null);
    setOrganization(null);
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      organization,
      loading,
      isConfigured,
      refreshOrganization,
      signOut,
    }),
    [
      firebaseUser,
      profile,
      organization,
      loading,
      isConfigured,
      refreshOrganization,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function useActiveMembership() {
  const { profile } = useAuth();
  return profile?.memberships.find((membership) => membership.isActive) ?? null;
}
