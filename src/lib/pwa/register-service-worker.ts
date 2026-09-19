export type RegisterServiceWorkerOptions = {
  onUpdateReady?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: unknown) => void;
};

function reportError(
  error: unknown,
  options?: RegisterServiceWorkerOptions
) {
  try {
    options?.onError?.(error);
  } catch {
    // Un callback de diagnóstico no debe interrumpir la aplicación.
  }
}

function reportUpdate(
  registration: ServiceWorkerRegistration,
  options?: RegisterServiceWorkerOptions
) {
  try {
    options?.onUpdateReady?.(registration);
  } catch (error) {
    reportError(error, options);
  }
}

function observeInstallingWorker(
  registration: ServiceWorkerRegistration,
  options?: RegisterServiceWorkerOptions
) {
  const installingWorker = registration.installing;

  if (!installingWorker) {
    return;
  }

  const handleStateChange = () => {
    if (
      installingWorker.state === "installed" &&
      navigator.serviceWorker.controller
    ) {
      reportUpdate(registration, options);
    }

    if (
      installingWorker.state === "installed" ||
      installingWorker.state === "redundant"
    ) {
      installingWorker.removeEventListener("statechange", handleStateChange);
    }
  };

  installingWorker.addEventListener("statechange", handleStateChange);
}

export async function registerServiceWorker(
  options?: RegisterServiceWorkerOptions
): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });

    if (registration.waiting) {
      reportUpdate(registration, options);
    }

    registration.addEventListener("updatefound", () => {
      observeInstallingWorker(registration, options);
    });

    return registration;
  } catch (error) {
    reportError(error, options);
    return null;
  }
}

export function activateWaitingServiceWorker(
  registration: ServiceWorkerRegistration
): boolean {
  if (!registration.waiting) {
    return false;
  }

  try {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    return true;
  } catch {
    return false;
  }
}
