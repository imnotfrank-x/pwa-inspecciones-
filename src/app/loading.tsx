import { InspectionList } from "../components/inspection-list";

export default function Loading() {
  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">Inspecciones de laboratorio</p>
        <h1>Cargando aplicación</h1>
        <p className="lead">
          Preparando el shell y los registros sintéticos.
        </p>
      </header>

      <InspectionList inspections={[]} state="loading" />
    </main>
  );
}
