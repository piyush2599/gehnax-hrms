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
  const { data: session } = useSession();
  const roles: string[] = (session?.user as any)?.roles || [];
  const isSuperAdmin = roles.includes("super_admin");

  const [impersonating, setImpersonating] = useState<ImpersonateState | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) { setImpersonating(null); return; }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setImpersonating(JSON.parse(stored));
    } catch {}
  }, [isSuperAdmin]);

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
