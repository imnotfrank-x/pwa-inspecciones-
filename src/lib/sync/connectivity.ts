export const CONNECTIVITY_SESSION_KEY = "utt-lab-inspections:connectivity:offline";

export type ConnectivityTarget = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

export type ConnectivityStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type ConnectivityGateOptions = {
  target: ConnectivityTarget;
  readOnline: () => boolean;
  storage?: ConnectivityStorage;
  onlineStabilityMs?: number;
  onConfirmedOnline?: () => void;
};

export function createConnectivityGate(options: ConnectivityGateOptions) {
  let knownOffline = false;
  let observedOfflineInDocument = !options.readOnline();
  let pendingOnline: ReturnType<typeof setTimeout> | undefined;

  const cancelOnlineConfirmation = (): void => {
    if (pendingOnline !== undefined) clearTimeout(pendingOnline);
    pendingOnline = undefined;
  };

  const readRememberedOffline = (): boolean => {
    try {
      return options.storage?.getItem(CONNECTIVITY_SESSION_KEY) === "1";
    } catch {
      return knownOffline;
    }
  };

  const rememberOffline = (): void => {
    cancelOnlineConfirmation();
    knownOffline = true;
    observedOfflineInDocument = true;
    try { options.storage?.setItem(CONNECTIVITY_SESSION_KEY, "1"); } catch {
      // La señal en memoria sigue protegiendo la página actual.
    }
  };

  const rememberOnline = (): void => {
    // Chromium puede emitir online durante una recarga que todavía está offline.
    // Un marcador heredado solo se libera tras observar offline en este documento.
    if (readRememberedOffline() && !observedOfflineInDocument) return;
    if (!options.readOnline()) return;
    cancelOnlineConfirmation();
    const confirm = () => {
      pendingOnline = undefined;
      if (disposed || !options.readOnline()) return;
      knownOffline = false;
      try { options.storage?.removeItem(CONNECTIVITY_SESSION_KEY); } catch {
        // navigator.onLine seguirá siendo la señal disponible en esta página.
      }
      options.onConfirmedOnline?.();
    };
    if (!readRememberedOffline()) confirm();
    else pendingOnline = setTimeout(confirm, options.onlineStabilityMs ?? 750);
  };

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    cancelOnlineConfirmation();
    options.target.removeEventListener("offline", rememberOffline);
    options.target.removeEventListener("online", rememberOnline);
    options.target.removeEventListener("pagehide", dispose);
  };

  if (!options.readOnline()) rememberOffline();

  options.target.addEventListener("offline", rememberOffline);
  options.target.addEventListener("online", rememberOnline);
  options.target.addEventListener("pagehide", dispose);

  return {
    isOnline: () => options.readOnline() && !readRememberedOffline(),
    dispose
  };
}
