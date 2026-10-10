"use client";

import { ChangeEvent, useId, useRef, useState } from "react";
import {
  CAMERA_FILE_INPUT,
  CameraEvidenceFailureReason,
  validateCameraEvidence
} from "../lib/device/camera";

type InspectionCapabilitiesProps = Readonly<{
  inspectionId: string;
}>;

type EvidenceState =
  | { status: "idle" }
  | { status: "selected"; mimeType: string; size: number }
  | {
      status: "fallback";
      reason: CameraEvidenceFailureReason;
      message: string;
    };

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function InspectionCapabilities({
  inspectionId
}: InspectionCapabilitiesProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [evidence, setEvidence] = useState<EvidenceState>({ status: "idle" });

  function handleEvidenceChange(event: ChangeEvent<HTMLInputElement>) {
    const result = validateCameraEvidence(event.currentTarget.files?.[0]);

    if (result.status === "selected") {
      setEvidence({
        status: "selected",
        mimeType: result.mimeType,
        size: result.size
      });
      return;
    }

    setEvidence(result);
  }

  function removeEvidence() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setEvidence({ status: "idle" });
  }

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      className="capabilities-panel"
      data-inspection-id={inspectionId}
    >
      <p className="eyebrow">Semana 6 · Capacidades opcionales</p>
      <h2 id={`${inputId}-heading`}>Evidencia fotográfica</h2>
      <p className="capabilities-description">
        Puedes tomar o seleccionar una imagen. La inspección continúa aunque
        canceles, rechaces el permiso o tu dispositivo no tenga cámara.
      </p>

      <div className="capability-control">
        <label className="capability-file-label" htmlFor={inputId}>
          Tomar o seleccionar imagen
        </label>
        <input
          accept={CAMERA_FILE_INPUT.accept}
          capture={CAMERA_FILE_INPUT.capture}
          id={inputId}
          multiple={CAMERA_FILE_INPUT.multiple}
          onChange={handleEvidenceChange}
          ref={inputRef}
          type="file"
        />
      </div>

      {evidence.status === "idle" ? (
        <p className="capability-feedback" role="status">
          No hay evidencia seleccionada. Este campo es opcional.
        </p>
      ) : null}

      {evidence.status === "selected" ? (
        <div className="capability-feedback capability-feedback-success">
          <p role="status">
            Evidencia lista en memoria: {evidence.mimeType}, {formatBytes(evidence.size)}.
            No se ha enviado ni guardado permanentemente.
          </p>
          <button className="capability-secondary-action" onClick={removeEvidence} type="button">
            Retirar evidencia
          </button>
        </div>
      ) : null}

      {evidence.status === "fallback" ? (
        <p className="capability-feedback capability-feedback-error" role="alert">
          {evidence.message}
        </p>
      ) : null}

      <p className="capability-privacy-note">
        Privacidad: esta demostración no conserva la imagen en localStorage ni
        la transmite a un servidor.
      </p>
    </section>
  );
}
