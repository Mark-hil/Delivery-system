import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AdminUser, CustomerUser, RiderUser } from "@/types";
import { storage } from "@/services/storage";
import { hasExpiredRequiredDocument, scheduleDocumentExpiryReminders } from "@/services/notifications";
import { LoginResult } from "@/services/mockApi";

interface Session {
  role: "customer" | "rider" | "admin";
  user: CustomerUser | RiderUser | AdminUser;
}

interface AuthContextValue {
  booting: boolean;
  session: Session | null;
  /** True when a logged-in rider's required documents have expired and must be re-verified before continuing. */
  riderNeedsDocumentRevalidation: boolean;
  /** Single entry point for the unified login screen — dispatches to the right
   * role-specific sign-in based on what mockApi.login() resolved. */
  signIn: (result: LoginResult) => Promise<void>;
  signInCustomer: (user: CustomerUser) => Promise<void>;
  signInRider: (user: RiderUser) => Promise<void>;
  signInAdmin: (user: AdminUser) => Promise<void>;
  updateRiderUser: (user: RiderUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await storage.getJSON<Session>(storage.keys.session);
      if (saved) setSession(saved);
      setBooting(false);
    })();
  }, []);

  const persist = useCallback(async (next: Session | null) => {
    setSession(next);
    if (next) await storage.setJSON(storage.keys.session, next);
    else await storage.remove(storage.keys.session);
  }, []);

  const signInCustomer = useCallback(async (user: CustomerUser) => {
    await persist({ role: "customer", user });
  }, [persist]);

  const signInRider = useCallback(async (user: RiderUser) => {
    await persist({ role: "rider", user });
    await scheduleDocumentExpiryReminders(user.documents);
  }, [persist]);

  const signInAdmin = useCallback(async (user: AdminUser) => {
    await persist({ role: "admin", user });
  }, [persist]);

  const updateRiderUser = useCallback(async (user: RiderUser) => {
    await persist({ role: "rider", user });
    await scheduleDocumentExpiryReminders(user.documents);
  }, [persist]);

  const signOut = useCallback(async () => {
    await persist(null);
  }, [persist]);

  const signIn = useCallback(
    async (result: LoginResult) => {
      if (result.role === "customer") await signInCustomer(result.user);
      else if (result.role === "rider") await signInRider(result.user);
      else await signInAdmin(result.user);
    },
    [signInCustomer, signInRider, signInAdmin]
  );

  const riderNeedsDocumentRevalidation = useMemo(() => {
    if (!session || session.role !== "rider") return false;
    return hasExpiredRequiredDocument((session.user as RiderUser).documents);
  }, [session]);

  const value: AuthContextValue = {
    booting,
    session,
    riderNeedsDocumentRevalidation,
    signIn,
    signInCustomer,
    signInRider,
    signInAdmin,
    updateRiderUser,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
