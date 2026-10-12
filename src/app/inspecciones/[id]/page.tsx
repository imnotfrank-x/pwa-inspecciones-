import { notFound } from "next/navigation";
import { getInspectionById } from "../../../lib/data/inspection-detail";
import { InspectionCapabilities } from "../../../components/inspection-capabilities";

export const dynamic = "force-dynamic";

type InspectionDetailPageProps = Readonly<{
  params: {
    id: string;
  };
}>;

export default async function InspectionDetailPage({
  params
}: InspectionDetailPageProps) {
  const inspection = await getInspectionById(params.id);

  if (!inspection) {
    notFound();
  }

  return (
    <div className="page-shell inspection-detail-shell">
      <a className="detail-back-link" href="/inspecciones">
        ← Volver al listado de inspecciones
      </a>

      <article
        aria-labelledby="inspection-detail-title"
        className="inspection-detail"
      >
        <header className="inspection-detail-header">
          <div>
            <p className="eyebrow">Semana 4 · Detalle SSR</p>
            <h1 id="inspection-detail-title">{inspection.location}</h1>
            <p className="lead">
              Información sintética de la inspección seleccionada, renderizada
              dinámicamente en el servidor.
            </p>
          </div>
          <span className={`badge badge-${inspection.status}`}>
            {inspection.statusLabel}
          </span>
        </header>

        <section
          aria-labelledby="inspection-data-heading"
          className="inspection-detail-content"
        >
          <h2 id="inspection-data-heading">Datos de la inspección</h2>
          <dl className="inspection-detail-list">
            <div>
              <dt>Laboratorio</dt>
              <dd>{inspection.location}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>
                <time dateTime={inspection.date}>{inspection.date}</time>
              </dd>
            </div>
            <div>
              <dt>Responsable</dt>
              <dd>{inspection.inspector}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{inspection.statusLabel}</dd>
            </div>
            <div>
              <dt>Número de hallazgos</dt>
              <dd>{inspection.findings}</dd>
            </div>
            <div className="inspection-detail-summary">
              <dt>Resumen</dt>
              <dd>{inspection.summary}</dd>
            </div>
          </dl>
        </section>

        <InspectionCapabilities inspectionId={inspection.id} />
      </article>
    </div>
  );
}
