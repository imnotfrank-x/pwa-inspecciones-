export type NotificationApi = Readonly<{
  permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
}>;

export type InspectionNotificationOptions = NotificationOptions &
  Readonly<{
    renotify?: boolean;
  }>;

export type NotificationRegistration = Readonly<{
  showNotification(
    title: string,
    options?: InspectionNotificationOptions
  ): Promise<void>;
}>;

export type NotificationDependencies = Readonly<{
  notificationApi?: NotificationApi | null;
  getRegistration?: (() => Promise<NotificationRegistration | null>) | null;
  createNotification?: ((
    title: string,
    options?: InspectionNotificationOptions
  ) => void) | null;
}>;

export type NotificationAvailability =
  | {
      supported: true;
      permission: NotificationPermission;
    }
  | {
      supported: false;
      permission: "unsupported";
      message: string;
    };

export type NotificationPermissionResult =
  | {
      status: "granted";
      message: string;
    }
  | {
      status: "denied" | "dismissed" | "unsupported" | "error";
      message: string;
    };

export type NotificationDisplayResult =
  | {
      status: "shown";
      channel: "service-worker" | "window";
      tag: string;
    }
  | {
      status: "fallback";
      reason: "unsupported" | "permission-required" | "display-error";
      message: string;
    };

const PERMISSION_MESSAGES = {
  granted: "Permiso de notificaciones concedido.",
  denied:
    "Las notificaciones están bloqueadas. La inspección puede continuar sin ellas.",
  dismissed:
    "No se eligió un permiso. La inspección puede continuar y usar el mensaje interno.",
  unsupported:
    "Este navegador no admite notificaciones. Se utilizará un mensaje dentro de la aplicación.",
  error:
    "No fue posible solicitar el permiso. La inspección puede continuar normalmente."
} as const;

function getBrowserNotificationApi(): NotificationApi | null {
  if (typeof Notification === "undefined") {
    return null;
  }

  return {
    get permission() {
      return Notification.permission;
    },
    requestPermission() {
      return Notification.requestPermission();
    }
  };
}

function resolveNotificationApi(
  dependencies: NotificationDependencies
): NotificationApi | null {
  if ("notificationApi" in dependencies) {
    return dependencies.notificationApi ?? null;
  }

  return getBrowserNotificationApi();
}

function getBrowserRegistration(): Promise<NotificationRegistration | null> {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    typeof navigator.serviceWorker.getRegistration !== "function"
  ) {
    return Promise.resolve(null);
  }

  return navigator.serviceWorker
    .getRegistration()
    .then((registration) => registration ?? null);
}

function resolveRegistrationGetter(
  dependencies: NotificationDependencies
): (() => Promise<NotificationRegistration | null>) | null {
  if ("getRegistration" in dependencies) {
    return dependencies.getRegistration ?? null;
  }

  return getBrowserRegistration;
}

function getBrowserNotificationFactory(): (
  title: string,
  options?: InspectionNotificationOptions
) => void {
  return (title, options) => {
    new Notification(title, options);
  };
}

function resolveNotificationFactory(
  dependencies: NotificationDependencies
): ((title: string, options?: InspectionNotificationOptions) => void) | null {
  if ("createNotification" in dependencies) {
    return dependencies.createNotification ?? null;
  }

  return typeof Notification === "undefined"
    ? null
    : getBrowserNotificationFactory();
}

export function getNotificationAvailability(
  dependencies: NotificationDependencies = {}
): NotificationAvailability {
  const notificationApi = resolveNotificationApi(dependencies);

  if (!notificationApi) {
    return {
      supported: false,
      permission: "unsupported",
      message: PERMISSION_MESSAGES.unsupported
    };
  }

  return {
    supported: true,
    permission: notificationApi.permission
  };
}

export async function requestNotificationPermission(
  dependencies: NotificationDependencies = {}
): Promise<NotificationPermissionResult> {
  const notificationApi = resolveNotificationApi(dependencies);

  if (!notificationApi) {
    return {
      status: "unsupported",
      message: PERMISSION_MESSAGES.unsupported
    };
  }

  if (notificationApi.permission === "granted") {
    return {
      status: "granted",
      message: PERMISSION_MESSAGES.granted
    };
  }

  if (notificationApi.permission === "denied") {
    return {
      status: "denied",
      message: PERMISSION_MESSAGES.denied
    };
  }

  try {
    const permission = await notificationApi.requestPermission();

    if (permission === "granted") {
      return {
        status: "granted",
        message: PERMISSION_MESSAGES.granted
      };
    }

    if (permission === "denied") {
      return {
        status: "denied",
        message: PERMISSION_MESSAGES.denied
      };
    }

    return {
      status: "dismissed",
      message: PERMISSION_MESSAGES.dismissed
    };
  } catch {
    return {
      status: "error",
      message: PERMISSION_MESSAGES.error
    };
  }
}

export function buildInspectionNotificationTag(inspectionId: string): string {
  return `labinspect:${inspectionId.trim()}:status`;
}

export async function showInspectionNotification(
  inspectionId: string,
  dependencies: NotificationDependencies = {}
): Promise<NotificationDisplayResult> {
  const notificationApi = resolveNotificationApi(dependencies);

  if (!notificationApi) {
    return {
      status: "fallback",
      reason: "unsupported",
      message: `Cambio sintético disponible para ${inspectionId}.`
    };
  }

  if (notificationApi.permission !== "granted") {
    return {
      status: "fallback",
      reason: "permission-required",
      message: `Cambio sintético disponible para ${inspectionId}.`
    };
  }

  const title = "Inspección actualizada";
  const tag = buildInspectionNotificationTag(inspectionId);
  const options: InspectionNotificationOptions = {
    body: `La inspección ${inspectionId} tiene un cambio sintético listo para revisión.`,
    tag,
    icon: "/icons/icon-192.png",
    renotify: false,
    data: {
      inspectionId
    }
  };
  const getRegistration = resolveRegistrationGetter(dependencies);

  if (getRegistration) {
    try {
      const registration = await getRegistration();

      if (registration) {
        await registration.showNotification(title, options);
        return {
          status: "shown",
          channel: "service-worker",
          tag
        };
      }
    } catch {
      // La notificación de ventana sigue disponible como segundo canal.
    }
  }

  const createNotification = resolveNotificationFactory(dependencies);

  if (createNotification) {
    try {
      createNotification(title, options);
      return {
        status: "shown",
        channel: "window",
        tag
      };
    } catch {
      // El mensaje interno es el fallback final.
    }
  }

  return {
    status: "fallback",
    reason: "display-error",
    message: `Cambio sintético disponible para ${inspectionId}.`
  };
}
