"use client";

type ErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <div className="page-shell">
      <section
        aria-labelledby="error-heading"
        className="state-panel state-panel-error"
        role="alert"
      >
        <p className="state-kicker">Error de aplicación</p>
        <h1 id="error-heading">No pudimos mostrar esta pantalla</h1>
        <p>
          Ocurrió un fallo inesperado. Los registros almacenados no fueron
          modificados.
        </p>
        <button className="state-action" onClick={reset} type="button">
          Volver a intentar
        </button>
      </section>
    </div>
  );
}
