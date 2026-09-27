import {
  inspections,
  type Inspection
} from "./inspections";

const SYNTHETIC_DETAIL_DELAY_MS = 400;

export async function getInspectionById(
  id: string
): Promise<Inspection | undefined> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, SYNTHETIC_DETAIL_DELAY_MS);
  });

  if (id === "error-demo") {
    throw new Error("Synthetic inspection detail error");
  }

  return inspections.find((inspection) => inspection.id === id);
}
