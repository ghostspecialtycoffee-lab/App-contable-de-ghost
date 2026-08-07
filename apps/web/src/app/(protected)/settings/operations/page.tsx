"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import {
  listWorkShiftsClient,
  loadOperationsProfileClient,
  saveOperationsProfileClient,
  saveWorkShiftClient,
} from "@/lib/operations/operations-client";
import {
  WEEKDAY_LABELS,
  WEEKDAYS,
  type DayBusinessHours,
  type OrganizationOperationsProfile,
  type WorkShiftRole,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

const SHIFT_ROLES: WorkShiftRole[] = ["bar", "cashier", "kitchen", "manager", "other"];

export default function OperationsSettingsPage() {
  const [profile, setProfile] = useState<OrganizationOperationsProfile | null>(null);
  const [shifts, setShifts] = useState<
    Array<{ id: string; staffName: string; role: WorkShiftRole; shiftDate: string; startTime: string; endTime: string }>
  >([]);
  const [staffName, setStaffName] = useState("");
  const [shiftRole, setShiftRole] = useState<WorkShiftRole>("bar");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("15:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadOperationsProfileClient(), listWorkShiftsClient()])
      .then(([operationsProfile, workShifts]) => {
        setProfile(operationsProfile);
        setShifts(workShifts);
      })
      .catch((cause) => setError(getCallableErrorMessage(cause)))
      .finally(() => setLoading(false));
  }, []);

  function updateDay(weekday: (typeof WEEKDAYS)[number], patch: Partial<DayBusinessHours>) {
    if (!profile) {
      return;
    }
    setProfile({
      ...profile,
      weeklyHours: {
        ...profile.weeklyHours,
        [weekday]: { ...profile.weeklyHours[weekday], ...patch },
      },
    });
  }

  async function handleSaveProfile() {
    if (!profile) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveOperationsProfileClient(profile);
      setMessage("Horarios y umbrales guardados. Ghost enviará recordatorios por correo.");
    } catch (cause) {
      setError(getCallableErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddShift() {
    setSaving(true);
    setError(null);
    try {
      await saveWorkShiftClient({
        staffName,
        role: shiftRole,
        shiftDate,
        startTime,
        endTime,
      });
      const updated = await listWorkShiftsClient();
      setShifts(updated);
      setStaffName("");
      setMessage("Turno guardado. Se notificará por correo a quienes tengan alertas activas.");
    } catch (cause) {
      setError(getCallableErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="ghost-page-stack">
        <PageHeader title="Operación y turnos" description="Horarios de atención y turnos del equipo." />
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="ghost-page-stack">
      <PageHeader
        title="Operación y turnos"
        description="Horarios de atención, recordatorios y turnos de barra, caja y cocina."
      />

      <Card title="Horarios de atención">
        <div className="space-y-3">
          {WEEKDAYS.map((weekday) => {
            const day = profile.weeklyHours[weekday];
            return (
              <div
                key={weekday}
                className="grid gap-2 rounded-lg border border-[var(--ghost-border)] p-3 sm:grid-cols-[120px_1fr_1fr_1fr]"
              >
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={day.isOpen}
                    onChange={(event) => updateDay(weekday, { isOpen: event.target.checked })}
                  />
                  {WEEKDAY_LABELS[weekday]}
                </label>
                <input
                  type="time"
                  value={day.openTime}
                  disabled={!day.isOpen}
                  onChange={(event) => updateDay(weekday, { openTime: event.target.value })}
                  className="ghost-input"
                />
                <input
                  type="time"
                  value={day.closeTime}
                  disabled={!day.isOpen}
                  onChange={(event) => updateDay(weekday, { closeTime: event.target.value })}
                  className="ghost-input"
                />
              </div>
            );
          })}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm">Recordatorio antes de abrir/cerrar (min)</span>
              <input
                type="number"
                min="5"
                max="120"
                value={profile.hoursReminderMinutes}
                onChange={(event) =>
                  setProfile({ ...profile, hoursReminderMinutes: Number(event.target.value) })
                }
                className="ghost-input"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm">Días sin movimiento para alertar inventario</span>
              <input
                type="number"
                min="1"
                max="90"
                value={profile.staleInventoryDays}
                onChange={(event) =>
                  setProfile({ ...profile, staleInventoryDays: Number(event.target.value) })
                }
                className="ghost-input"
              />
            </label>
          </div>

          <Button type="button" onClick={handleSaveProfile} disabled={saving}>
            Guardar horarios
          </Button>
        </div>
      </Card>

      <Card title="Turnos del equipo">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={staffName}
            onChange={(event) => setStaffName(event.target.value)}
            placeholder="Nombre"
            className="ghost-input"
          />
          <select
            value={shiftRole}
            onChange={(event) => setShiftRole(event.target.value as WorkShiftRole)}
            className="ghost-input"
          >
            {SHIFT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={shiftDate}
            onChange={(event) => setShiftDate(event.target.value)}
            className="ghost-input"
          />
          <div className="flex gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="ghost-input"
            />
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="ghost-input"
            />
          </div>
        </div>
        <Button type="button" className="mt-3" onClick={handleAddShift} disabled={saving || !staffName.trim()}>
          Agregar turno
        </Button>

        {shifts.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm text-[var(--ghost-text-muted)]">
            {shifts.slice(0, 8).map((shift) => (
              <li key={shift.id}>
                {shift.staffName} · {shift.role} · {shift.shiftDate} {shift.startTime}–{shift.endTime}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {error ? <p className="text-sm text-[var(--ghost-danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--ghost-brand-500)]">{message}</p> : null}
    </div>
  );
}
