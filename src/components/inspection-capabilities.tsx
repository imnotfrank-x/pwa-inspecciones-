"use client";

import { ChangeEvent, useId, useRef, useState } from "react";
import {
  CAMERA_FILE_INPUT,
  CameraEvidenceFailureReason,
  validateCameraEvidence
} from "../lib/device/camera";
import {
  ApproximateCoordinates,
  GeolocationFailureReason,
  formatApproximateCoordinates,
  requestApproximateLocation
} from "../lib/device/geolocation";

const MANUAL_REFERENCE_MAX_LENGTH = 120;

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

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; coordinates: ApproximateCoordinates }
  | {
      status: "error";
      reason: GeolocationFailureReason;
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
  const locationId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [evidence, setEvidence] = useState<EvidenceState>({ status: "idle" });
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [manualReference, setManualReference] = useState("");

  // El permiso se solicita solo desde este manejador de clic; nunca al montar.
  async function handleUseCurrentLocation() {
    setLocation({ status: "loading" });
    const result = await requestApproximateLocation();

    if (result.status === "success") {
      setLocation({ status: "success", coordinates: result.coordinates });
      return;
    }

    setLocation({
      status: "error",
      reason: result.status,
      message: result.message
    });
  }

  function clearLocation() {
    setLocation({ status: "idle" });
  }

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

      <div
        aria-labelledby={`${locationId}-heading`}
        className="capability-location"
        role="group"
        style={{ borderTop: "1px solid var(--line)", marginTop: 28, paddingTop: 24 }}
      >
        <h3 id={`${locationId}-heading`}>Ubicación aproximada</h3>
        <p className="capabilities-description">
          Puedes asociar una ubicación aproximada a la inspección. Es opcional:
          el navegador solo pedirá permiso cuando pulses el botón.
        </p>

        <div className="capability-control">
          <button
            aria-busy={location.status === "loading"}
            className="capability-file-label"
            disabled={location.status === "loading"}
            onClick={handleUseCurrentLocation}
            type="button"
          >
            {location.status === "loading"
              ? "Obteniendo ubicación…"
              : "Usar ubicación actual"}
          </button>
        </div>

        <div aria-live="polite">
          {location.status === "idle" ? (
            <p className="capability-feedback" role="status">
              Sin ubicación. Este dato es opcional y la inspección puede
              continuar sin él.
            </p>
          ) : null}

          {location.status === "loading" ? (
            <p className="capability-feedback" role="status">
              Obteniendo ubicación aproximada…
            </p>
          ) : null}

          {location.status === "success" ? (
            <div className="capability-feedback capability-feedback-success">
              <p role="status">
                Ubicación aproximada:{" "}
                {formatApproximateCoordinates(location.coordinates)}
                {location.coordinates.accuracyMeters !== null
                  ? ` (precisión reportada: ±${location.coordinates.accuracyMeters} m)`
                  : ""}
                . Solo se muestra en pantalla.
              </p>
              <button
                className="capability-secondary-action"
                onClick={clearLocation}
                type="button"
              >
                Descartar ubicación
              </button>
            </div>
          ) : null}
        </div>

        {location.status === "error" ? (
          <p
            className="capability-feedback capability-feedback-error"
            data-reason={location.reason}
            role="alert"
          >
            {location.message}
          </p>
        ) : null}

        <div className="capability-manual-reference" style={{ display: "grid", gap: 8, marginTop: 16 }}>
          <label htmlFor={`${locationId}-manual`} style={{ fontWeight: 700 }}>
            Referencia manual (opcional)
          </label>
          <input
            aria-describedby={`${locationId}-manual-hint`}
            autoComplete="off"
            id={`${locationId}-manual`}
            maxLength={MANUAL_REFERENCE_MAX_LENGTH}
            onChange={(event) => setManualReference(event.currentTarget.value)}
            placeholder="Ejemplo: Laboratorio B, planta 2"
            style={{
              border: "1px solid var(--line)",
              borderRadius: 10,
              font: "inherit",
              maxWidth: 480,
              minHeight: 44,
              padding: "10px 12px",
              width: "100%"
            }}
            type="text"
            value={manualReference}
          />
          <small className="muted" id={`${locationId}-manual-hint`}>
            Alternativa sin permisos. Usa una referencia sintética, sin
            direcciones ni datos personales reales.
          </small>
        </div>

        <p className="capability-privacy-note">
          Privacidad: la ubicación no se guarda ni se transmite. Las
          coordenadas se redondean a tres decimales y solo permanecen en
          memoria mientras la vista está abierta.
        </p>
      </div>
    </section>
  );
}
