import { InspectionList } from "../components/inspection-list";

export default function Loading() {
  return (
    <div className="page-shell">
      <section
        aria-labelledby="loading-title"
        className="hero"
      >
        <p className="eyebrow">Inspecciones de laboratorio</p>
        <h1 id="loading-title">Cargando aplicación</h1>
        <p className="lead">
          Preparando el shell y los registros sintéticos.
        </p>
      </section>

      <InspectionList inspections={[]} state="loading" />
    </div>
  );
}
