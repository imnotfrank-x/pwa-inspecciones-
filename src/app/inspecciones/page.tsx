"use client";

import { useEffect, useState } from "react";
import { InspectionList } from "../../components/inspection-list";
import { LoadingState } from "../../components/loading-state";
import {
  inspections as syntheticInspections,
  type Inspection
} from "../../lib/data/inspections";

type RequestedState = "ready" | "loading" | "error" | "empty";
type ClientState = RequestedState;

const SYNTHETIC_DELAY_MS = 350;

function readRequestedState(): RequestedState {
  const requestedState = new URLSearchParams(window.location.search).get(
    "estado"
  );

  switch (requestedState) {
    case "carga":
      return "loading";
    case "error":
      return "error";
    case "vacio":
      return "empty";
    default:
      return "ready";
  }
}

export default function InspectionsPage() {
  const [requestedState, setRequestedState] =
    useState<RequestedState | null>(null);
  const [clientState, setClientState] = useState<ClientState>("loading");
  const [records, setRecords] = useState<Inspection[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setRequestedState(readRequestedState());
  }, []);

  useEffect(() => {
    if (requestedState === null) {
      return;
    }

    setClientState("loading");
    setRecords([]);

    if (requestedState === "loading") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (requestedState === "error") {
        setClientState("error");
        return;
      }

      if (requestedState === "empty") {
        setClientState("empty");
        return;
      }

      setRecords(syntheticInspections);
      setClientState("ready");
    }, SYNTHETIC_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [attempt, requestedState]);

  function retryLoading() {
    window.history.replaceState(null, "", "/inspecciones");
    setRequestedState("ready");
    setAttempt((currentAttempt) => currentAttempt + 1);
  }

  return (
    <div className="page-shell">
      <section aria-labelledby="inspections-page-title" className="hero">
        <p className="eyebrow">Semana 4 · Renderizado CSR</p>
        <h1 id="inspections-page-title">Listado de inspecciones</h1>
        <p className="lead">
          Esta ruta carga en el navegador registros exclusivamente sintéticos
          y permite comprobar sus estados sin depender de servicios externos.
        </p>
        <span className="status">CSR · interacción en cliente</span>
      </section>

      <section
        aria-labelledby="csr-result-heading"
        className="content-section"
        id="csr-result"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Resultado de la consulta</p>
            <h2 id="csr-result-heading">Registros disponibles</h2>
          </div>
          <span className="count">Renderizado en cliente</span>
        </div>

        {clientState === "loading" ? (
          <LoadingState
            description="La consulta sintética se ejecuta después de hidratar la ruta en el navegador."
            title="Cargando el listado CSR"
          />
        ) : null}

        {clientState === "error" ? (
          <div className="state-panel state-panel-error" role="alert">
            <p className="state-kicker">Fallo sintético verificable</p>
            <h2>No fue posible cargar las inspecciones</h2>
            <p>
              El error fue solicitado mediante la URL de demostración. No se
              modificó ningún registro.
            </p>
            <button
              className="state-action"
              onClick={retryLoading}
              type="button"
            >
              Volver a intentar
            </button>
          </div>
        ) : null}

        {clientState === "empty" ? (
          <InspectionList
            inspections={[]}
            state="empty"
            stateActionHref="/inspecciones"
          />
        ) : null}

        {clientState === "ready" ? (
          <InspectionList inspections={records} state="ready" />
        ) : null}
      </section>

      <aside
        aria-labelledby="csr-verification-heading"
        className="state-verification"
        id="csr-state-verification"
      >
        <h2 id="csr-verification-heading">Estados verificables del CSR</h2>
        <p>
          Cada enlace selecciona un resultado determinista para facilitar la
          revisión manual y automatizada.
        </p>
        <nav aria-label="Estados del listado CSR">
          <a href="/inspecciones">Contenido</a>
          <a href="/inspecciones?estado=carga">Carga</a>
          <a href="/inspecciones?estado=error">Error</a>
          <a href="/inspecciones?estado=vacio">Vacío</a>
        </nav>
      </aside>
    </div>
  );
}
