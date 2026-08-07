"use client";

import type {
  BeverageAdvancedSetupAnswers,
  BeverageAdvancedSetupQuestion,
  BeverageAdvancedSetupSpec,
} from "@ghost/domain";
import { getBeverageAdvancedSetupProgress } from "@ghost/domain";

interface BeverageAdvancedSetupPanelProps {
  spec: BeverageAdvancedSetupSpec;
  answers: BeverageAdvancedSetupAnswers;
  onChange: (answers: BeverageAdvancedSetupAnswers) => void;
  disabled?: boolean;
}

function isConditionalQuestionVisible(
  question: BeverageAdvancedSetupQuestion,
  answers: BeverageAdvancedSetupAnswers,
): boolean {
  if (question.id === "milkMl") {
    return answers.includesMilk === "yes";
  }
  if (question.id === "mixerOther") {
    return answers.mixerProduct === "other";
  }
  if (question.id === "brewMethodOther") {
    return answers.brewMethod === "other";
  }
  return true;
}

export function BeverageAdvancedSetupPanel({
  spec,
  answers,
  onChange,
  disabled = false,
}: BeverageAdvancedSetupPanelProps) {
  const progress = getBeverageAdvancedSetupProgress(spec.displayName, answers);

  function updateAnswer(questionId: string, value: string) {
    onChange({ ...answers, [questionId]: value });
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--ghost-brand-500)]/40 bg-[var(--ghost-surface-2)] p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--ghost-brand-500)]">
          Confirmación de barra · pensamiento avanzado
        </p>
        <p className="text-xs text-[var(--ghost-text-muted)]">{spec.contextNote}</p>
        {spec.defaultAssumption ? (
          <p className="text-xs text-[var(--ghost-text-muted)]">
            Supuesto actual: {spec.defaultAssumption}
          </p>
        ) : null}
        <p className="text-xs text-[var(--ghost-brand-500)]">
          {progress.isComplete
            ? "Confirmación completa"
            : `${progress.answered}/${progress.total} respuestas`}
        </p>
      </div>

      <div className="space-y-3">
        {spec.questions.map((question) => {
          if (!isConditionalQuestionVisible(question, answers)) {
            return null;
          }

          const fieldId = `beverage-setup-${spec.productKey}-${question.id}`;

          return (
            <label key={question.id} className="block space-y-1" htmlFor={fieldId}>
              <span className="text-sm font-medium">{question.label}</span>
              {question.hint ? (
                <span className="block text-xs text-[var(--ghost-text-muted)]">
                  {question.hint}
                </span>
              ) : null}

              {question.type === "select" ? (
                <select
                  id={fieldId}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => updateAnswer(question.id, event.target.value)}
                  disabled={disabled}
                  className="ghost-input"
                >
                  <option value="">Seleccionar…</option>
                  {(question.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : question.type === "boolean" ? (
                <select
                  id={fieldId}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => updateAnswer(question.id, event.target.value)}
                  disabled={disabled}
                  className="ghost-input"
                >
                  <option value="">Seleccionar…</option>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    id={fieldId}
                    type={question.type === "number" ? "number" : "text"}
                    min={question.type === "number" ? "0" : undefined}
                    step={question.type === "number" ? "any" : undefined}
                    value={answers[question.id] ?? ""}
                    onChange={(event) => updateAnswer(question.id, event.target.value)}
                    disabled={disabled}
                    placeholder={question.placeholder}
                    className="ghost-input flex-1"
                  />
                  {question.unit ? (
                    <span className="text-xs text-[var(--ghost-text-muted)]">{question.unit}</span>
                  ) : null}
                </div>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
