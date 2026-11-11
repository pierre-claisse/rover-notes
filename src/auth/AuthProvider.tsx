import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfigurationError } from "../crypto/errors";
import { openBootstrap, parseSecretsFile, type BootstrapPayload, type SecretsFile } from "../crypto/envelope";
import type { VaultSession } from "../vault/session";

export type AuthStatus = "locked" | "unlocking" | "unlocked";

type AuthValue = {
  status: AuthStatus;
  configIssue: "missing" | "invalid" | null;
  loginError: string | null;
  unlock: (username: string, password: string) => Promise<void>;
  lock: () => Promise<void>;
  getSecrets: () => BootstrapPayload | null;
  registerVault: (session: VaultSession | null) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({
  children,
  secretsUrl,
  fetchImpl,
}: {
  children: ReactNode;
  secretsUrl: string;
  fetchImpl?: typeof fetch;
}) {
  const [status, setStatus] = useState<AuthStatus>("locked");
  const [configIssue, setConfigIssue] = useState<"missing" | "invalid" | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const fileRef = useRef<SecretsFile | null>(null);
  const secretsRef = useRef<BootstrapPayload | null>(null);
  const vaultRef = useRef<VaultSession | null>(null);

  useEffect(() => {
    const load = fetchImpl ?? fetch;
    let cancelled = false;
    void (async () => {
      try {
        const response = await load(secretsUrl, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setConfigIssue("missing");
          return;
        }
        const parsed = parseSecretsFile(JSON.parse(await response.text()) as unknown);
        if (!cancelled) fileRef.current = parsed;
      } catch {
        if (!cancelled) setConfigIssue("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchImpl, secretsUrl]);

  const lock = useCallback(async () => {
    const vault = vaultRef.current;
    if (vault) await vault.flushDrafts();
    vault?.dispose();
    const secrets = secretsRef.current;
    if (secrets) {
      secrets.dataKey.fill(0);
      secrets.pat = "";
    }
    secretsRef.current = null;
    setLoginError(null);
    setStatus("locked");
  }, []);

  const unlock = useCallback(async (username: string, password: string) => {
    const file = fileRef.current;
    if (!file) return;
    setStatus("unlocking");
    setLoginError(null);
    try {
      const payload = await openBootstrap(file, password, username);
      if (!payload) {
        setStatus("locked");
        setLoginError("Identifiant ou mot de passe incorrect.");
        return;
      }
      secretsRef.current = payload;
      setStatus("unlocked");
    } catch (error) {
      setStatus("locked");
      if (error instanceof ConfigurationError) setConfigIssue("invalid");
      else setLoginError("Identifiant ou mot de passe incorrect.");
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      configIssue,
      loginError,
      unlock,
      lock,
      getSecrets: () => secretsRef.current,
      registerVault: (session) => {
        vaultRef.current = session;
      },
    }),
    [configIssue, lock, loginError, status, unlock],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Auth hors écran");
  return value;
}
