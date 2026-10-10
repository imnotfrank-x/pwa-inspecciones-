export const CAMERA_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;

export const CAMERA_EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export const CAMERA_FILE_INPUT = Object.freeze({
  accept: "image/*",
  capture: "environment" as const,
  multiple: false
});

export type CameraFallbackReason =
  | "unsupported"
  | "permission-denied"
  | "capture-error";

export type CameraAccessResult =
  | {
      status: "ready";
      stream: MediaStream;
    }
  | {
      status: "fallback";
      reason: CameraFallbackReason;
      message: string;
    };

export type CameraAvailability =
  | { supported: true }
  | {
      supported: false;
      reason: "unsupported";
      message: string;
    };

export type CameraEvidenceFile = Readonly<{
  size: number;
  type: string;
}>;

export type CameraEvidenceFailureReason =
  | "cancelled"
  | "invalid-file"
  | "invalid-type"
  | "too-large";

export type CameraEvidenceValidation<T extends CameraEvidenceFile> =
  | {
      status: "selected";
      file: T;
      mimeType: string;
      size: number;
    }
  | {
      status: "fallback";
      reason: CameraEvidenceFailureReason;
      message: string;
    };

export type CameraMediaDevices = Pick<MediaDevices, "getUserMedia">;

export type CameraDependencies = Readonly<{
  mediaDevices?: CameraMediaDevices | null;
}>;

const UNSUPPORTED_MESSAGE =
  "La cámara no está disponible. Puedes seleccionar una imagen guardada.";

function resolveMediaDevices(
  dependencies: CameraDependencies
): CameraMediaDevices | null {
  if ("mediaDevices" in dependencies) {
    return dependencies.mediaDevices ?? null;
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    return null;
  }

  return navigator.mediaDevices;
}

function errorName(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    return error.name;
  }

  return "";
}

export function getCameraAvailability(
  dependencies: CameraDependencies = {}
): CameraAvailability {
  return resolveMediaDevices(dependencies)
    ? { supported: true }
    : {
        supported: false,
        reason: "unsupported",
        message: UNSUPPORTED_MESSAGE
      };
}

export async function requestCameraAccess(
  dependencies: CameraDependencies = {}
): Promise<CameraAccessResult> {
  const mediaDevices = resolveMediaDevices(dependencies);

  if (!mediaDevices) {
    return {
      status: "fallback",
      reason: "unsupported",
      message: UNSUPPORTED_MESSAGE
    };
  }

  try {
    const stream = await mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" }
      }
    });

    return { status: "ready", stream };
  } catch (error) {
    const name = errorName(error);

    if (name === "NotAllowedError" || name === "SecurityError") {
      return {
        status: "fallback",
        reason: "permission-denied",
        message:
          "No se concedió acceso a la cámara. Puedes seleccionar una imagen guardada."
      };
    }

    return {
      status: "fallback",
      reason: "capture-error",
      message:
        "No fue posible iniciar la cámara. Puedes seleccionar una imagen guardada."
    };
  }
}

export function stopCameraStream(
  stream: Pick<MediaStream, "getTracks"> | null | undefined
): number {
  if (!stream) {
    return 0;
  }

  let stoppedTracks = 0;

  for (const track of stream.getTracks()) {
    try {
      track.stop();
      stoppedTracks += 1;
    } catch {
      // Una pista defectuosa no debe impedir liberar las demás.
    }
  }

  return stoppedTracks;
}

export function validateCameraEvidence<T extends CameraEvidenceFile>(
  file: T | null | undefined,
  maxBytes = CAMERA_EVIDENCE_MAX_BYTES
): CameraEvidenceValidation<T> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError("maxBytes debe ser un entero positivo.");
  }

  if (!file) {
    return {
      status: "fallback",
      reason: "cancelled",
      message: "No se seleccionó evidencia. La inspección puede continuar."
    };
  }

  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    return {
      status: "fallback",
      reason: "invalid-file",
      message: "El archivo seleccionado no tiene un tamaño válido."
    };
  }

  const mimeType = file.type.trim().toLowerCase();

  if (!(CAMERA_EVIDENCE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return {
      status: "fallback",
      reason: "invalid-type",
      message: "Selecciona una imagen JPEG, PNG o WebP."
    };
  }

  if (file.size > maxBytes) {
    return {
      status: "fallback",
      reason: "too-large",
      message: "La imagen supera el límite permitido de 5 MB."
    };
  }

  return {
    status: "selected",
    file,
    mimeType,
    size: file.size
  };
}
