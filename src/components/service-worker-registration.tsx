"use client";

import { useEffect, useRef } from "react";
import { registerServiceWorker } from "../lib/pwa/register-service-worker";

export function ServiceWorkerRegistration() {
  const hasController = useRef(false);
  const isReloading = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    hasController.current = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (!hasController.current) {
        hasController.current = true;
        return;
      }

      if (isReloading.current) {
        return;
      }

      isReloading.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    void registerServiceWorker({
      onError(error) {
        console.error("No fue posible registrar el Service Worker.", error);
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  return null;
}
