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
};

export function createConnectivityGate(options: ConnectivityGateOptions) {
  let knownOffline = false;

  const readRememberedOffline = (): boolean => {
    try {
      return options.storage?.getItem(CONNECTIVITY_SESSION_KEY) === "1";
    } catch {
      return knownOffline;
    }
  };

  const rememberOffline = (): void => {
    knownOffline = true;
    try { options.storage?.setItem(CONNECTIVITY_SESSION_KEY, "1"); } catch {
      // La señal en memoria sigue protegiendo la página actual.
    }
  };

  const rememberOnline = (): void => {
    knownOffline = false;
    try { options.storage?.removeItem(CONNECTIVITY_SESSION_KEY); } catch {
      // navigator.onLine seguirá siendo la señal disponible en esta página.
    }
  };

  if (!options.readOnline()) rememberOffline();

  options.target.addEventListener("offline", rememberOffline);
  options.target.addEventListener("online", rememberOnline);

  return {
    isOnline: () => options.readOnline() && !readRememberedOffline(),
    dispose: () => {
      options.target.removeEventListener("offline", rememberOffline);
      options.target.removeEventListener("online", rememberOnline);
    }
  };
}
