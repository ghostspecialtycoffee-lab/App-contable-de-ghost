"use client";

import Link from "next/link";

import { useDailyBriefing } from "@/hooks/use-daily-briefing";
import { Card } from "@ghost/ui";

function renderBriefingText(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
    const content = parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-[var(--ghost-text)]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("_") && part.endsWith("_")) {
        return (
          <em key={index} className="text-[var(--ghost-text-muted)]">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <span key={index}>{part}</span>;
    });

    return (
      <span key={lineIndex}>
        {content}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

function severityClass(severity: "info" | "warning" | "critical"): string {
  if (severity === "critical") {
    return "border-[var(--ghost-danger)] bg-[color-mix(in_srgb,var(--ghost-danger)_8%,transparent)]";
  }
  if (severity === "warning") {
    return "border-[var(--ghost-warning)] bg-[color-mix(in_srgb,var(--ghost-warning)_8%,transparent)]";
  }
  return "border-[var(--ghost-border)] bg-[var(--ghost-surface-2)]";
}

export function ProactiveBriefingPanel() {
  const { briefing, loading } = useDailyBriefing();

  if (loading) {
    return (
      <Card title="Briefing del día">
        <p className="text-sm text-[var(--ghost-text-muted)]">Analizando la operación…</p>
      </Card>
    );
  }

  if (!briefing) {
    return null;
  }

  const hasAlerts = briefing.headlineCount > 0;

  return (
    <Card title="Briefing del día">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--ghost-text)]">
          {renderBriefingText(briefing.message)}
        </p>

        {hasAlerts ? (
          <ul className="space-y-2" aria-label="Detalle de novedades">
            {briefing.items.slice(0, 6).map((item) => (
              <li
                key={item.id}
                className={`rounded-lg border px-3 py-2 text-sm ${severityClass(item.severity)}`}
              >
                {renderBriefingText(item.message)}
                {item.suggestion ? (
                  <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">{item.suggestion}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-xs text-[var(--ghost-text-muted)]">
          Pregunta a Ghost «resumen del día» o abre{" "}
          <Link href="/chat" className="underline">
            el chat
          </Link>{" "}
          para actuar sobre estas novedades.
        </p>
      </div>
    </Card>
  );
}
