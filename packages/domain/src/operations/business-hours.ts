/** Horarios de atención del local. */

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export interface DayBusinessHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export type WeeklyBusinessHours = Record<Weekday, DayBusinessHours>;

export interface OrganizationOperationsProfile {
  timezone: string;
  weeklyHours: WeeklyBusinessHours;
  /** Días sin movimiento de inventario para alertar. */
  staleInventoryDays: number;
  /** Minutos antes de apertura/cierre para recordatorio por correo. */
  hoursReminderMinutes: number;
}

export const DEFAULT_WEEKLY_BUSINESS_HOURS: WeeklyBusinessHours = {
  monday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  tuesday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  wednesday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  thursday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  friday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  saturday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  sunday: { isOpen: false, openTime: "08:00", closeTime: "14:00" },
};

export const DEFAULT_OPERATIONS_PROFILE: OrganizationOperationsProfile = {
  timezone: "America/Bogota",
  weeklyHours: DEFAULT_WEEKLY_BUSINESS_HOURS,
  staleInventoryDays: 14,
  hoursReminderMinutes: 30,
};

export function weekdayFromDate(date: Date, timezone: string): Weekday {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });
  const day = formatter.format(date).toLowerCase() as Weekday;
  return WEEKDAYS.includes(day) ? day : "monday";
}

export function minutesUntilTime(now: Date, targetTime: string, timezone: string): number | null {
  const [hours, minutes] = targetTime.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";

  const currentMinutes = Number(get("hour")) * 60 + Number(get("minute"));
  const targetMinutes = hours * 60 + minutes;
  return targetMinutes - currentMinutes;
}

export function formatBusinessHoursLine(day: DayBusinessHours): string {
  if (!day.isOpen) {
    return "Cerrado";
  }
  return `${day.openTime} – ${day.closeTime}`;
}
