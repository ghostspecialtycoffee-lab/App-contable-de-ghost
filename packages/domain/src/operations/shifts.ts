/** Turnos de personal — barra, caja, cocina. */

export type WorkShiftRole = "bar" | "cashier" | "kitchen" | "manager" | "other";

export const WORK_SHIFT_ROLE_LABELS: Record<WorkShiftRole, string> = {
  bar: "Barra",
  cashier: "Caja",
  kitchen: "Cocina",
  manager: "Administración",
  other: "Otro",
};

export interface WorkShift {
  id: string;
  organizationId: string;
  branchId: string;
  staffName: string;
  role: WorkShiftRole;
  shiftDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkShiftInput {
  staffName: string;
  role: WorkShiftRole;
  shiftDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export function formatWorkShiftSummary(shift: Pick<WorkShift, "staffName" | "role" | "shiftDate" | "startTime" | "endTime">): string {
  return `${shift.staffName} · ${WORK_SHIFT_ROLE_LABELS[shift.role]} · ${shift.shiftDate} ${shift.startTime}–${shift.endTime}`;
}
