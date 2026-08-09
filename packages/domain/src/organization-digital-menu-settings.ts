export const DIGITAL_MENU_ACCENT_STYLES = ["warm", "minimal", "espresso"] as const;

export type DigitalMenuAccentStyle = (typeof DIGITAL_MENU_ACCENT_STYLES)[number];

export const DIGITAL_MENU_ACCENT_STYLE_LABELS: Record<DigitalMenuAccentStyle, string> = {
  warm: "Cálido (café artesanal)",
  minimal: "Minimal (blanco y limpio)",
  espresso: "Espresso (oscuro elegante)",
};

export interface OrganizationDigitalMenuSettings {
  heroTitle: string;
  heroSubtitle: string;
  footerNote: string;
  accentStyle: DigitalMenuAccentStyle;
  showSearch: boolean;
}

export interface PublicDigitalMenuConfig extends OrganizationDigitalMenuSettings {
  organizationId: string;
  organizationName: string;
  slug?: string;
  logoDataUrl?: string;
  logoMimeType?: string;
}

export const DEFAULT_DIGITAL_MENU_SETTINGS: OrganizationDigitalMenuSettings = {
  heroTitle: "Nuestro menú",
  heroSubtitle:
    "Explora bebidas, comida y repostería. Cuando decidas, cuéntanos al equipo qué te gustaría pedir.",
  footerNote: "Precios en COP · IVA incluido donde aplique",
  accentStyle: "warm",
  showSearch: true,
};

export function validateDigitalMenuSettings(
  input: Partial<OrganizationDigitalMenuSettings>,
): { ok: true; value: OrganizationDigitalMenuSettings } | { ok: false; error: string } {
  const heroTitle = (input.heroTitle ?? DEFAULT_DIGITAL_MENU_SETTINGS.heroTitle).trim();
  const heroSubtitle = (input.heroSubtitle ?? DEFAULT_DIGITAL_MENU_SETTINGS.heroSubtitle).trim();
  const footerNote = (input.footerNote ?? DEFAULT_DIGITAL_MENU_SETTINGS.footerNote).trim();
  const accentStyle = input.accentStyle ?? DEFAULT_DIGITAL_MENU_SETTINGS.accentStyle;
  const showSearch = input.showSearch ?? DEFAULT_DIGITAL_MENU_SETTINGS.showSearch;

  if (heroTitle.length < 2) {
    return { ok: false, error: "El título del menú debe tener al menos 2 caracteres." };
  }

  if (!DIGITAL_MENU_ACCENT_STYLES.includes(accentStyle)) {
    return { ok: false, error: "Estilo visual no válido." };
  }

  return {
    ok: true,
    value: {
      heroTitle: heroTitle.slice(0, 80),
      heroSubtitle: heroSubtitle.slice(0, 240),
      footerNote: footerNote.slice(0, 160),
      accentStyle,
      showSearch,
    },
  };
}

export function resolveDigitalMenuSettings(
  input?: Partial<OrganizationDigitalMenuSettings> | null,
): OrganizationDigitalMenuSettings {
  const validation = validateDigitalMenuSettings(input ?? {});
  return validation.ok ? validation.value : DEFAULT_DIGITAL_MENU_SETTINGS;
}
