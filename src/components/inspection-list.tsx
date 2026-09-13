import type { Inspection } from "../lib/data/inspections";

export type InspectionViewState =
  | "ready"
  | "loading"
  | "error"
  | "empty";

type InspectionListProps = {
  inspections: Inspection[];
  state?: InspectionViewState;
};

export function InspectionList({
  inspections,
  state = "ready"
}: InspectionListProps) {
  const countLabel =
    state === "ready"
      ? `${inspections.length} registros`
      : "Vista de estado";

  return (
    <section
      aria-busy={state === "loading"}
      aria-labelledby="inspections-heading"
      className="content-section"
      id="inspecciones"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Datos de demostración</p>
          <h2 id="inspections-heading">Inspecciones recientes</h2>
        </div>
        <span className="count">{countLabel}</span>
      </div>

      {state === "loading" ? (
        <div
          aria-live="polite"
          className="state-panel state-panel-loading"
          role="status"
        >
          <p className="state-kicker">Cargando información</p>
          <h3>Preparando las inspecciones</h3>
          <p>
            Espera mientras se consultan los registros sintéticos disponibles.
          </p>

          <div aria-hidden="true" className="loading-placeholder">
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : null}

      {state === "error" ? (
        <div className="state-panel state-panel-error" role="alert">
          <p className="state-kicker">No fue posible continuar</p>
          <h3>Ocurrió un error al cargar las inspecciones</h3>
          <p>
            La información no pudo mostrarse. Los registros existentes no
            fueron modificados.
          </p>
          <a className="state-action" href="/">
            Volver a intentar
          </a>
        </div>
      ) : null}

      {state === "empty" ||
      (state === "ready" && inspections.length === 0) ? (
        <div
          aria-live="polite"
          className="state-panel state-panel-empty"
          role="status"
        >
          <p className="state-kicker">Sin registros disponibles</p>
          <h3>Todavía no hay inspecciones para mostrar</h3>
          <p>
            Cuando exista una inspección sintética aparecerá en esta sección.
          </p>
          <a className="state-action" href="/">
            Consultar nuevamente
          </a>
        </div>
      ) : null}

      {state === "ready" && inspections.length > 0 ? (
        <div className="inspection-grid">
          {inspections.map((inspection) => (
            <article className="inspection-card" key={inspection.id}>
              <div className="card-topline">
                <span className={`badge badge-${inspection.status}`}>
                  {inspection.statusLabel}
                </span>
                <span className="muted">{inspection.date}</span>
              </div>

              <h3>{inspection.location}</h3>
              <p>{inspection.summary}</p>

              <dl>
                <div>
                  <dt>Responsable</dt>
                  <dd>{inspection.inspector}</dd>
                </div>
                <div>
                  <dt>Hallazgos</dt>
                  <dd>{inspection.findings}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
