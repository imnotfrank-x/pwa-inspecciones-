import {
  InspectionList,
  type InspectionViewState
} from "../components/inspection-list";
import { inspections } from "../lib/data/inspections";

type HomePageProps = {
  searchParams?: {
    estado?: string | string[];
  };
};

function resolveInspectionState(
  requestedState: string | string[] | undefined
): InspectionViewState {
  const state = Array.isArray(requestedState)
    ? requestedState[0]
    : requestedState;

  switch (state) {
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

export default function HomePage({ searchParams }: HomePageProps) {
  const state = resolveInspectionState(searchParams?.estado);

  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">Proyecto acumulativo · Semana 2</p>
        <h1>Inspecciones de laboratorio</h1>
        <p className="lead">
          Registro de mantenimiento preparado para trabajar con conectividad
          intermitente. Los datos mostrados son sintéticos.
        </p>
        <span className="status">
          Manifest instalable · estados verificables
        </span>
      </header>

      <InspectionList inspections={inspections} state={state} />

      <aside
        aria-labelledby="state-verification-heading"
        className="state-verification"
      >
        <h2 id="state-verification-heading">
          Verificación reproducible de estados
        </h2>
        <p>
          Estas vistas utilizan únicamente datos sintéticos y permiten comprobar
          cada estado sin depender de servicios externos.
        </p>
        <nav aria-label="Vistas de verificación">
          <a href="/">Registros</a>
          <a href="/?estado=carga">Carga</a>
          <a href="/?estado=error">Error</a>
          <a href="/?estado=vacio">Vacío</a>
        </nav>
      </aside>

      <footer className="footer">
        <p>
          Aplicaciones Web Progresivas · Universidad Tecnológica de Tehuacán
        </p>
      </footer>
    </main>
  );
}
