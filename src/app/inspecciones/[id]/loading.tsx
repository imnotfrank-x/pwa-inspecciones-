import { LoadingState } from "../../../components/loading-state";

export default function InspectionDetailLoading() {
  return (
    <div className="page-shell inspection-detail-shell">
      <LoadingState
        description="Consultando el registro sintético seleccionado en el servidor."
        title="Cargando detalle de inspección"
      />
    </div>
  );
}
