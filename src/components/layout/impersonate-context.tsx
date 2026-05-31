"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface ImpersonateState {
  id: string;
  name: string;
  employeeCode: string;
}

interface ImpersonateCtx {
  impersonating: ImpersonateState | null;
  startImpersonation: (emp: ImpersonateState) => void;
  stopImpersonation: () => void;
}

const ImpersonateContext = createContext<ImpersonateCtx>({
  impersonating: null,
  startImpersonation: () => {},
  stopImpersonation: () => {},
});

const STORAGE_KEY = "hrms_impersonate";

export function ImpersonateProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const roles: string[] = (session?.user as any)?.roles || [];
  const isSuperAdmin = roles.includes("super_admin");

  // Initialize synchronously from localStorage so first render has the correct value
  const [impersonating, setImpersonating] = useState<ImpersonateState | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // Clear impersonation if the session turns out not to be super_admin
  useEffect(() => {
    if (status === "loading") return;
    if (!isSuperAdmin) {
      setImpersonating(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isSuperAdmin, status]);

  const startImpersonation = useCallback((emp: ImpersonateState) => {
    setImpersonating(emp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emp));
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonating(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ImpersonateContext.Provider value={{ impersonating, startImpersonation, stopImpersonation }}>
      {children}
    </ImpersonateContext.Provider>
  );
}

export const useImpersonate = () => useContext(ImpersonateContext);
