export default function InspectionDetailNotFound() {
  return (
    <div className="page-shell inspection-detail-shell">
      <section
        aria-labelledby="inspection-not-found-title"
        className="state-panel inspection-not-found"
      >
        <p className="state-kicker">Registro no encontrado</p>
        <h1 id="inspection-not-found-title">
          La inspección sintética no existe
        </h1>
        <p>
          No encontramos un registro con ese identificador. Esto no representa
          un error del servidor.
        </p>
        <a className="state-action" href="/inspecciones">
          Volver al listado
        </a>
      </section>
    </div>
  );
}
