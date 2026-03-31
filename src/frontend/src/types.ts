import type { Checklist, InspectionStatus } from "./backend";

export interface LastInspectionInfo {
  date: bigint;
  status: InspectionStatus;
  checklist: Checklist;
}
