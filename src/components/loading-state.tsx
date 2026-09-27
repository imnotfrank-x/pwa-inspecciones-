type LoadingStateProps = Readonly<{
  title?: string;
  description?: string;
}>;

export function LoadingState({
  title = "Cargando inspecciones",
  description = "Consultando los registros sintéticos disponibles."
}: LoadingStateProps) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="state-panel state-panel-loading"
      role="status"
    >
      <p className="state-kicker">Carga en curso</p>
      <h2>{title}</h2>
      <p>{description}</p>

      <div aria-hidden="true" className="loading-placeholder">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
