export const GEOLOCATION_OPTIONS: Readonly<PositionOptions> = Object.freeze({
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 60000
});

export const GEOLOCATION_DISPLAY_DECIMALS = 3;

export type GeolocationFailureReason =
  | "unsupported"
  | "permission-denied"
  | "position-unavailable"
  | "timeout"
  | "unexpected-error";

export type ApproximateCoordinates = Readonly<{
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}>;

export type GeolocationResult =
  | {
      status: "success";
      coordinates: ApproximateCoordinates;
    }
  | {
      status: GeolocationFailureReason;
      message: string;
    };

export type GeolocationAvailability =
  | { supported: true }
  | {
      supported: false;
      reason: "unsupported";
      message: string;
    };

/**
 * Solo se requiere la lectura puntual. `watchPosition` queda fuera del
 * contrato a propósito para impedir seguimiento continuo.
 */
export type GeolocationProvider = Pick<Geolocation, "getCurrentPosition">;

export type GeolocationDependencies = Readonly<{
  geolocation?: GeolocationProvider | null;
}>;

const POSITION_ERROR_PERMISSION_DENIED = 1;
const POSITION_ERROR_POSITION_UNAVAILABLE = 2;
const POSITION_ERROR_TIMEOUT = 3;

export const GEOLOCATION_MESSAGES: Readonly<
  Record<GeolocationFailureReason, string>
> = Object.freeze({
  unsupported:
    "Este navegador no ofrece geolocalización. Puedes escribir una referencia manual.",
  "permission-denied":
    "No se concedió permiso de ubicación. La inspección continúa; puedes escribir una referencia manual.",
  "position-unavailable":
    "No fue posible determinar la ubicación en este momento. Puedes escribir una referencia manual.",
  timeout:
    "La ubicación tardó demasiado en responder. Puedes intentarlo de nuevo o escribir una referencia manual.",
  "unexpected-error":
    "Ocurrió un problema inesperado al obtener la ubicación. Puedes escribir una referencia manual."
});

function failure(reason: GeolocationFailureReason): GeolocationResult {
  return { status: reason, message: GEOLOCATION_MESSAGES[reason] };
}

function resolveGeolocation(
  dependencies: GeolocationDependencies
): GeolocationProvider | null {
  if ("geolocation" in dependencies) {
    const injected = dependencies.geolocation;
    return injected && typeof injected.getCurrentPosition === "function"
      ? injected
      : null;
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.geolocation ||
    typeof navigator.geolocation.getCurrentPosition !== "function"
  ) {
    return null;
  }

  return navigator.geolocation;
}

function errorCode(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    return error.code;
  }

  return null;
}

export function roundCoordinate(
  value: number,
  decimals = GEOLOCATION_DISPLAY_DECIMALS
): number {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    throw new RangeError("decimals debe ser un entero entre 0 y 6.");
  }

  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;

  // Evita representar -0 en la interfaz.
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function toApproximateCoordinates(
  coords: Pick<GeolocationCoordinates, "latitude" | "longitude"> &
    Partial<Pick<GeolocationCoordinates, "accuracy">>,
  decimals = GEOLOCATION_DISPLAY_DECIMALS
): ApproximateCoordinates | null {
  const { latitude, longitude, accuracy } = coords;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return Object.freeze({
    latitude: roundCoordinate(latitude, decimals),
    longitude: roundCoordinate(longitude, decimals),
    accuracyMeters:
      typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0
        ? Math.round(accuracy)
        : null
  });
}

export function formatApproximateCoordinates(
  coordinates: ApproximateCoordinates,
  decimals = GEOLOCATION_DISPLAY_DECIMALS
): string {
  return `${coordinates.latitude.toFixed(decimals)}, ${coordinates.longitude.toFixed(decimals)}`;
}

export function mapGeolocationError(error: unknown): GeolocationResult {
  switch (errorCode(error)) {
    case POSITION_ERROR_PERMISSION_DENIED:
      return failure("permission-denied");
    case POSITION_ERROR_POSITION_UNAVAILABLE:
      return failure("position-unavailable");
    case POSITION_ERROR_TIMEOUT:
      return failure("timeout");
    default:
      return failure("unexpected-error");
  }
}

/**
 * Consulta pasiva: no invoca `getCurrentPosition` y, por lo tanto, no
 * muestra solicitudes de permiso.
 */
export function getGeolocationAvailability(
  dependencies: GeolocationDependencies = {}
): GeolocationAvailability {
  return resolveGeolocation(dependencies)
    ? { supported: true }
    : {
        supported: false,
        reason: "unsupported",
        message: GEOLOCATION_MESSAGES.unsupported
      };
}

/**
 * Debe invocarse únicamente desde una acción explícita de la persona.
 * Realiza una sola lectura con precisión baja y devuelve coordenadas ya
 * redondeadas. No guarda ni transmite la posición.
 */
export function requestApproximateLocation(
  dependencies: GeolocationDependencies = {}
): Promise<GeolocationResult> {
  const geolocation = resolveGeolocation(dependencies);

  if (!geolocation) {
    return Promise.resolve(failure("unsupported"));
  }

  return new Promise<GeolocationResult>((resolve) => {
    let settled = false;

    const settle = (result: GeolocationResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    try {
      geolocation.getCurrentPosition(
        (position) => {
          const coordinates = position?.coords
            ? toApproximateCoordinates(position.coords)
            : null;

          settle(
            coordinates
              ? { status: "success", coordinates }
              : failure("position-unavailable")
          );
        },
        (error) => settle(mapGeolocationError(error)),
        { ...GEOLOCATION_OPTIONS }
      );
    } catch {
      settle(failure("unexpected-error"));
    }
  });
}
