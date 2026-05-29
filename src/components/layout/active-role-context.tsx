"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface ActiveRoleCtx {
  activeRole: string;
  switchRole: (role: string) => void;
  userRoles: string[];
}

const ActiveRoleContext = createContext<ActiveRoleCtx>({
  activeRole: "employee",
  switchRole: () => {},
  userRoles: ["employee"],
});

export function ActiveRoleProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const userRoles: string[] = user?.roles?.length ? user.roles : ["employee"];
  const storageKey = `active_role_${user?.id || "guest"}`;

  const [activeRole, setActiveRole] = useState<string>("employee");

  // Only resolve the active role once the session has finished loading
  useEffect(() => {
    if (status === "loading") return;
    const saved = localStorage.getItem(storageKey);
    if (saved && userRoles.includes(saved)) {
      setActiveRole(saved);
    } else {
      setActiveRole(userRoles[0] || "employee");
    }
  }, [storageKey, status, userRoles.join(",")]); // eslint-disable-line

  const switchRole = useCallback((role: string) => {
    setActiveRole(role);
    localStorage.setItem(storageKey, role);
  }, [storageKey]);

  return (
    <ActiveRoleContext.Provider value={{ activeRole, switchRole, userRoles }}>
      {children}
    </ActiveRoleContext.Provider>
  );
}

export const useActiveRole = () => useContext(ActiveRoleContext);
