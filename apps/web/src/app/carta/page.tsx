"use client";

function PrinterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function formatPrice(value: number): string {
  return `$ ${value.toLocaleString("es-CO")}`;
}

interface MenuItem {
  name: string;
  price: number;
  note?: string;
}

interface MenuSection {
  id: string;
  emoji: string;
  title: string;
  subtitle?: string;
  accent: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    id: "calientes",
    emoji: "☕",
    title: "Cafés Calientes",
    subtitle: "Preparados al momento con granos de origen",
    accent: "#3d2914",
    items: [
      { name: "Capuchino", price: 7000 },
      { name: "Americano", price: 5000 },
      { name: "Filtrados exóticos", price: 8000 },
      { name: "Café Lattes", price: 7000 },
      { name: "Aromática tropical", price: 6000 },
      { name: "Aromática jengibre / limón", price: 6000 },
    ],
  },
  {
    id: "acompanantes",
    emoji: "🥐",
    title: "Acompañantes",
    subtitle: "Repostería artesanal del día",
    accent: "#3d2914",
    items: [
      { name: "Croissant", price: 3600 },
      { name: "Torta Red Velvet", price: 7000 },
      { name: "Torta Chocolate", price: 7000 },
      { name: "Torta de Naranja", price: 7000 },
    ],
  },
  {
    id: "frios",
    emoji: "🧊",
    title: "Cafés Fríos",
    subtitle: "Refrescantes y llenos de sabor",
    accent: "#1e4d6b",
    items: [
      { name: "Cold Brew", price: 8000 },
      { name: "Granizados 10 oz", price: 13000 },
      { name: "Frappé de café", price: 15000 },
    ],
  },
  {
    id: "cocktails",
    emoji: "🍹",
    title: "Cócteles & Bebidas Summer",
    subtitle: "Mezclas frescas para el calor",
    accent: "#7a1f1f",
    items: [
      { name: "Cóctel Coffee Sangria", price: 15000 },
      { name: "Soda cereza", price: 9000 },
      { name: "Soda de la casa", price: 8000 },
      { name: "Sangría", price: 9000 },
      { name: "Mojito naranja", price: 9000 },
      { name: "Mojito maracuyá", price: 9000 },
      { name: "Michelada", price: 7000 },
      { name: "Michelada de sandía", price: 9000 },
      { name: "Borojó", price: 9000 },
      { name: "Borojó cargado", price: 19000 },
    ],
  },
  {
    id: "desayuno",
    emoji: "🌅",
    title: "Desayuno Express",
    subtitle: "El mejor comienzo del día",
    accent: "#3d2914",
    items: [
      { name: "Desayuno del día", price: 11000 },
      { name: "Desayuno saludable", price: 15000 },
      { name: "Avena", price: 6000 },
      { name: "Milo frío / caliente", price: 5000 },
      { name: "Chocolatte", price: 4000 },
      { name: "Tinto", price: 3000 },
    ],
  },
  {
    id: "fitness",
    emoji: "💪",
    title: "Almuerzos Fitness",
    subtitle: "Nutrición y sabor en cada plato",
    accent: "#1a4a2a",
    items: [
      {
        name: "Pollo y verduras en salsa + ensalada del día",
        price: 17000,
        note: "400g",
      },
      {
        name: "Carne de res y verduras en salsa + ensalada del día",
        price: 17000,
        note: "400g",
      },
      { name: "Batidos fitness", price: 9000 },
    ],
  },
];

function OrnamentDivider() {
  return (
    <div className="carta-ornament">
      <span className="carta-ornament-line" />
      <span className="carta-ornament-diamond">◆</span>
      <span className="carta-ornament-line" />
    </div>
  );
}

function SectionBlock({ section }: { section: MenuSection }) {
  return (
    <section className="carta-section">
      <div className="carta-section-header" style={{ borderLeftColor: section.accent }}>
        <span className="carta-section-emoji">{section.emoji}</span>
        <div>
          <h2 className="carta-section-title" style={{ color: section.accent }}>
            {section.title}
          </h2>
          {section.subtitle ? (
            <p className="carta-section-subtitle">{section.subtitle}</p>
          ) : null}
        </div>
      </div>

      <ul className="carta-item-list">
        {section.items.map((item) => (
          <li key={item.name} className="carta-item-row">
            <span className="carta-item-name">
              {item.name}
              {item.note ? (
                <span className="carta-item-note"> · {item.note}</span>
              ) : null}
            </span>
            <span className="carta-item-dots" aria-hidden="true" />
            <span className="carta-item-price">{formatPrice(item.price)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CartaPage() {
  const handlePrint = () => window.print();

  return (
    <div className="carta-root">
      {/* Print button — hidden when printing */}
      <div className="carta-print-bar">
        <button onClick={handlePrint} className="carta-print-btn" type="button">
          <PrinterIcon />
          <span>Imprimir carta</span>
        </button>
      </div>

      <div className="carta-page">
        {/* ── Hero ── */}
        <header className="carta-hero">
          <div className="carta-hero-glow" />
          <div className="carta-hero-body">
            <span className="carta-hero-cup" aria-hidden="true">☕</span>
            <p className="carta-hero-eyebrow">Bienvenido</p>
            <h1 className="carta-hero-title">Nuestra Carta</h1>
            <p className="carta-hero-tagline">
              Bebidas · Repostería · Desayunos · Almuerzos
            </p>
          </div>
        </header>

        <OrnamentDivider />

        {/* ── Menu sections ── */}
        <div className="carta-body">
          {MENU_SECTIONS.map((section, idx) => (
            <div key={section.id}>
              <SectionBlock section={section} />
              {idx < MENU_SECTIONS.length - 1 ? <OrnamentDivider /> : null}
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <footer className="carta-footer">
          <OrnamentDivider />
          <p className="carta-footer-note">
            Todos los precios están en pesos colombianos (COP) e incluyen IVA.
          </p>
          <p className="carta-footer-brand">con sabor &amp; dedicación</p>
        </footer>
      </div>
    </div>
  );
}
