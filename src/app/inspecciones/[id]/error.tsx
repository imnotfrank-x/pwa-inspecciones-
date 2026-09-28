"use client";

type InspectionDetailErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function InspectionDetailError({
  error,
  reset
}: InspectionDetailErrorProps) {
  void error;

  return (
    <div className="page-shell inspection-detail-shell">
      <section className="state-panel state-panel-error" role="alert">
        <p className="state-kicker">No fue posible continuar</p>
        <h1>Ocurrió un error al cargar la inspección</h1>
        <p>
          El detalle sintético no pudo mostrarse. Puedes volver a intentarlo
          sin abandonar la aplicación.
        </p>
        <button className="state-action" onClick={() => reset()} type="button">
          Volver a intentar
        </button>
      </section>
    </div>
  );
}
