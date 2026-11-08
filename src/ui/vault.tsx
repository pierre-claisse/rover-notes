import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { VaultSession } from "../vault/session";

const VaultContext = createContext<VaultSession | null>(null);

export function VaultProvider({ session, children }: { session: VaultSession; children: ReactNode }) {
  return <VaultContext.Provider value={session}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const session = useContext(VaultContext);
  if (!session) throw new Error("Coffre non monté");
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { session, snap };
}
