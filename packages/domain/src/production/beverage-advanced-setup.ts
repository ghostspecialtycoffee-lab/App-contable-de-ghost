export type BeverageAdvancedSetupFieldType = "text" | "number" | "select" | "boolean";

export interface BeverageAdvancedSetupOption {
  value: string;
  label: string;
}

export interface BeverageAdvancedSetupQuestion {
  id: string;
  label: string;
  hint?: string;
  type: BeverageAdvancedSetupFieldType;
  options?: BeverageAdvancedSetupOption[];
  unit?: string;
  placeholder?: string;
}

export interface BeverageAdvancedSetupSpec {
  productKey: string;
  displayName: string;
  contextNote: string;
  defaultAssumption?: string;
  questions: BeverageAdvancedSetupQuestion[];
}

export type BeverageAdvancedSetupAnswers = Record<string, string>;

const BEVERAGE_ADVANCED_SETUP_SPECS: BeverageAdvancedSetupSpec[] = [
  {
    productKey: "mocaccino",
    displayName: "Mocaccino",
    contextNote: "No estándar SCA · hoy no hay cacao en bodega",
    questions: [
      {
        id: "chocolateProduct",
        label: "¿Qué chocolate usan?",
        type: "text",
        placeholder: "Marca o insumo de inventario",
      },
      {
        id: "chocolateGrams",
        label: "¿Cuántos gramos por taza?",
        type: "number",
        unit: "g",
        placeholder: "Ej. 15",
      },
    ],
  },
  {
    productKey: "carajillo",
    displayName: "Carajillo",
    contextNote: "No estándar SCA · sin insumo claro en compras",
    questions: [
      {
        id: "liquorProduct",
        label: "¿Qué licor?",
        type: "text",
        placeholder: "Ej. Licor 43, brandy…",
      },
      {
        id: "liquorMl",
        label: "¿Cuántos ml?",
        type: "number",
        unit: "ml",
        placeholder: "Ej. 30",
      },
    ],
  },
  {
    productKey: "irlandes",
    displayName: "Irlandés",
    contextNote: "No estándar SCA · sin insumo claro en compras",
    questions: [
      {
        id: "whiskyProduct",
        label: "¿Qué whisky?",
        type: "text",
        placeholder: "Marca o insumo",
      },
      {
        id: "whiskyMl",
        label: "¿Cuántos ml de whisky?",
        type: "number",
        unit: "ml",
        placeholder: "Ej. 30",
      },
      {
        id: "creamProduct",
        label: "¿Qué crema?",
        type: "text",
        placeholder: "Crema de leche, chantilly…",
      },
      {
        id: "creamMl",
        label: "¿Cuántos ml de crema?",
        type: "number",
        unit: "ml",
        placeholder: "Ej. 30",
      },
    ],
  },
  {
    productKey: "dirty-chai",
    displayName: "Dirty Chai",
    contextNote: "No estándar SCA · sin insumo claro en compras",
    questions: [
      {
        id: "chaiConcentrateMl",
        label: "¿Concentrado de chai (ml)?",
        type: "number",
        unit: "ml",
        placeholder: "Ej. 60",
      },
      {
        id: "includesMilk",
        label: "¿Lleva leche?",
        type: "select",
        options: [
          { value: "yes", label: "Sí" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "milkMl",
        label: "¿Cuántos ml de leche?",
        type: "number",
        unit: "ml",
        hint: "Solo si lleva leche",
        placeholder: "Ej. 150",
      },
    ],
  },
  {
    productKey: "espresso-tonic",
    displayName: "Espresso Tonic",
    contextNote: "No estándar SCA · sin insumo claro en compras",
    defaultAssumption: "Hoy: 150 ml Soda Izots",
    questions: [
      {
        id: "mixerProduct",
        label: "¿Usan Soda Izots, tónica Schweppes u otro?",
        type: "select",
        options: [
          { value: "soda-izots", label: "Soda Izots" },
          { value: "schweppes-tonic", label: "Tónica Schweppes" },
          { value: "other", label: "Otro" },
        ],
      },
      {
        id: "mixerOther",
        label: "¿Cuál otro mixer?",
        type: "text",
        hint: "Solo si eligió «Otro»",
        placeholder: "Nombre del producto",
      },
      {
        id: "mixerMl",
        label: "¿Cuántos ml de mixer?",
        type: "number",
        unit: "ml",
        placeholder: "Ej. 150",
      },
    ],
  },
  {
    productKey: "soda-italiana",
    displayName: "Soda Italiana",
    contextNote: "No estándar SCA · sin insumo claro en compras",
    questions: [
      {
        id: "syrupFlavor",
        label: "¿Qué jarabe o sabor?",
        type: "text",
        placeholder: "Ej. frambuesa, lavanda…",
      },
      {
        id: "syrupMl",
        label: "¿Cuántos ml de jarabe además de la soda?",
        type: "number",
        unit: "ml",
        placeholder: "Ej. 30",
      },
    ],
  },
  {
    productKey: "ufo",
    displayName: "OVNI / Ufo",
    contextNote: "Método de barra por confirmar",
    defaultAssumption: "Hoy asumido: V60 · 18 g · 300 ml",
    questions: [
      {
        id: "brewMethod",
        label: "¿Qué método es en la barra?",
        type: "select",
        options: [
          { value: "v60", label: "V60" },
          { value: "aeropress", label: "Aeropress" },
          { value: "chemex", label: "Chemex" },
          { value: "prensa-francesa", label: "Prensa francesa" },
          { value: "other", label: "Otro" },
        ],
      },
      {
        id: "brewMethodOther",
        label: "¿Cuál otro método?",
        type: "text",
        hint: "Solo si eligió «Otro»",
      },
      {
        id: "coffeeGrams",
        label: "¿Cuántos gramos de café?",
        type: "number",
        unit: "g",
        placeholder: "Ej. 18",
      },
      {
        id: "waterMl",
        label: "¿Cuántos ml de agua?",
        type: "number",
        unit: "ml",
        placeholder: "Ej. 300",
      },
    ],
  },
  {
    productKey: "colbrew",
    displayName: "Colbrew",
    contextNote: "Ratio y proceso por confirmar en Ghost",
    defaultAssumption: "Hoy: 20 g · 200 ml en frío",
    questions: [
      {
        id: "coffeeGrams",
        label: "¿Cuántos gramos de café?",
        type: "number",
        unit: "g",
        placeholder: "Ej. 20",
      },
      {
        id: "waterMl",
        label: "¿Cuántos ml de agua o hielo?",
        type: "number",
        unit: "ml",
        placeholder: "Ej. 200",
      },
      {
        id: "processNotes",
        label: "¿Cuál es el proceso real en Ghost?",
        type: "text",
        placeholder: "Ej. inmersión 12 h, filtrado en frío…",
      },
    ],
  },
];

const PRODUCT_NAME_ALIASES: Record<string, string> = {
  irlandes: "irlandes",
  irlandés: "irlandes",
  ovni: "ufo",
  ufo: "ufo",
};

export function normalizeBeverageSetupProductName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function resolveProductKey(productName: string): string | null {
  const normalized = normalizeBeverageSetupProductName(productName);
  const aliasKey = PRODUCT_NAME_ALIASES[normalized] ?? normalized;

  for (const spec of BEVERAGE_ADVANCED_SETUP_SPECS) {
    if (normalizeBeverageSetupProductName(spec.displayName) === aliasKey) {
      return spec.productKey;
    }
    if (spec.productKey === aliasKey) {
      return spec.productKey;
    }
  }

  const byKey = BEVERAGE_ADVANCED_SETUP_SPECS.find((spec) => spec.productKey === aliasKey);
  return byKey?.productKey ?? null;
}

export function getBeverageAdvancedSetupSpec(
  productName: string,
): BeverageAdvancedSetupSpec | null {
  const productKey = resolveProductKey(productName);
  if (!productKey) {
    return null;
  }

  return (
    BEVERAGE_ADVANCED_SETUP_SPECS.find((spec) => spec.productKey === productKey) ?? null
  );
}

export function needsBeverageAdvancedSetup(productName: string): boolean {
  return getBeverageAdvancedSetupSpec(productName) !== null;
}

export function listBeverageAdvancedSetupProductKeys(): string[] {
  return BEVERAGE_ADVANCED_SETUP_SPECS.map((spec) => spec.productKey);
}

function isQuestionAnswered(
  question: BeverageAdvancedSetupQuestion,
  answers: BeverageAdvancedSetupAnswers,
): boolean {
  const value = answers[question.id]?.trim() ?? "";

  if (question.type === "boolean" || question.type === "select") {
    return value.length > 0;
  }

  if (question.type === "number") {
    if (!value) {
      return false;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }

  return value.length > 0;
}

function isConditionalQuestionRequired(
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

export function getBeverageAdvancedSetupProgress(
  productName: string,
  answers: BeverageAdvancedSetupAnswers | undefined,
): { total: number; answered: number; isComplete: boolean } {
  const spec = getBeverageAdvancedSetupSpec(productName);
  if (!spec) {
    return { total: 0, answered: 0, isComplete: true };
  }

  const resolvedAnswers = answers ?? {};
  const requiredQuestions = spec.questions.filter((question) =>
    isConditionalQuestionRequired(question, resolvedAnswers),
  );

  const answered = requiredQuestions.filter((question) =>
    isQuestionAnswered(question, resolvedAnswers),
  ).length;

  return {
    total: requiredQuestions.length,
    answered,
    isComplete: answered === requiredQuestions.length,
  };
}

export function sanitizeBeverageAdvancedSetupAnswers(
  productName: string,
  answers: BeverageAdvancedSetupAnswers,
): BeverageAdvancedSetupAnswers {
  const spec = getBeverageAdvancedSetupSpec(productName);
  if (!spec) {
    return {};
  }

  const sanitized: BeverageAdvancedSetupAnswers = {};
  for (const question of spec.questions) {
    const value = answers[question.id]?.trim();
    if (!value) {
      continue;
    }
    if (!isConditionalQuestionRequired(question, answers)) {
      continue;
    }
    sanitized[question.id] = value;
  }
  return sanitized;
}
