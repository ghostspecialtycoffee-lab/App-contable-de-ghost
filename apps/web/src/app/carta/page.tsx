import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

/**
 * Carta digital estática de la cafetería.
 *
 * Personaliza la identidad del negocio editando estas constantes:
 *  - CAFE_NAME     → nombre que aparece en el encabezado y el pie.
 *  - CAFE_EYEBROW  → línea pequeña superior (categorías / claim corto).
 *  - CAFE_TAGLINE  → frase descriptiva bajo el nombre.
 *  - CAFE_FOOTER   → nota final (horario, dirección, redes, etc.).
 *
 * Los precios están en pesos colombianos (COP) como números enteros; el
 * formato con separador de miles se aplica automáticamente.
 */
const CAFE_NAME = "Café Aurora";
const CAFE_EYEBROW = "Café de especialidad · Repostería · Coctelería";
const CAFE_TAGLINE =
  "Tostados de origen, cocina fresca y bebidas de temporada, preparados al momento.";
const CAFE_FOOTER = "Gracias por acompañarnos · Precios en pesos colombianos (COP)";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: `Carta · ${CAFE_NAME}`,
  description: `Carta digital de ${CAFE_NAME}: cafés calientes y fríos, repostería, coctelería de temporada, desayunos y almuerzos fitness.`,
};

type MenuItem = {
  name: string;
  price: number;
  desc?: string;
};

type MenuSection = {
  id: string;
  title: string;
  mark: string;
  note?: string;
  items: MenuItem[];
};

const MENU: MenuSection[] = [
  {
    id: "cafes-calientes",
    title: "Cafés calientes",
    mark: "☕",
    items: [
      { name: "Capuchino", price: 7000 },
      { name: "Americano", price: 5000 },
      { name: "Filtrados exóticos", price: 8000, desc: "Métodos de filtrado, granos de origen" },
      { name: "Café latte", price: 7000 },
      { name: "Aromática tropical", price: 6000 },
      { name: "Aromática jengibre / limón", price: 6000 },
    ],
  },
  {
    id: "cocteles",
    title: "Cócteles & bebidas summer",
    mark: "🍹",
    note: "Bebidas de temporada",
    items: [
      { name: "Cóctel Coffee sangría", price: 15000, desc: "Nuestra sangría con espresso frío" },
      { name: "Soda cereza", price: 9000 },
      { name: "Soda de la casa", price: 8000 },
      { name: "Sangría", price: 9000 },
      { name: "Mojito naranja", price: 9000 },
      { name: "Mojito maracuyá", price: 9000 },
      { name: "Michelada", price: 7000 },
      { name: "Michelada de sandía", price: 9000 },
      { name: "Borojó", price: 9000 },
      { name: "Borojó cargado", price: 19000, desc: "Versión reforzada" },
    ],
  },
  {
    id: "cafes-frios",
    title: "Cafés fríos",
    mark: "🧊",
    items: [
      { name: "Cold brew", price: 8000, desc: "Extracción en frío" },
      { name: "Granizados", price: 13000, desc: "Vaso de 10 oz" },
      { name: "Frappé de café", price: 15000 },
    ],
  },
  {
    id: "desayuno",
    title: "Desayuno express",
    mark: "🍳",
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
    id: "acompanantes",
    title: "Repostería & acompañantes",
    mark: "🥐",
    items: [
      { name: "Croissant", price: 3600 },
      { name: "Torta red velvet", price: 7000 },
      { name: "Torta de chocolate", price: 7000 },
      { name: "Torta de naranja", price: 7000 },
    ],
  },
  {
    id: "almuerzos",
    title: "Almuerzos fitness",
    mark: "🥗",
    note: "Porción de 400 g · incluye ensalada del día",
    items: [
      { name: "Pollo y verduras en salsa", price: 17000, desc: "400 g con ensalada del día" },
      {
        name: "Carne de res y verduras en salsa",
        price: 17000,
        desc: "400 g con ensalada del día",
      },
      { name: "Batidos fitness", price: 9000 },
    ],
  },
];

function formatCOP(value: number): string {
  return `$${value.toLocaleString("es-CO")}`;
}

function MenuSectionBlock({ section }: { section: MenuSection }) {
  return (
    <section className="carta-section" aria-labelledby={`sec-${section.id}`}>
      <div className="carta-section-head">
        <span aria-hidden="true">{section.mark}</span>
        <h2 id={`sec-${section.id}`} className="carta-section-title">
          {section.title}
        </h2>
        <span className="carta-section-rule" aria-hidden="true" />
      </div>
      {section.note ? <p className="carta-section-note">{section.note}</p> : null}
      <ul className="carta-list">
        {section.items.map((item) => (
          <li key={item.name} className="carta-item">
            <span className="carta-item-body">
              <span className="carta-item-name">{item.name}</span>
              {item.desc ? <span className="carta-item-desc">{item.desc}</span> : null}
            </span>
            <span className="carta-leader" aria-hidden="true" />
            <span className="carta-item-price">{formatCOP(item.price)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CartaPage() {
  return (
    <div className={`carta min-h-screen ${fraunces.variable}`}>
      <div className="carta-shell">
        <article className="carta-paper">
          <div className="carta-inner">
            <header className="carta-header">
              <p className="carta-eyebrow">{CAFE_EYEBROW}</p>
              <h1 className="carta-title">{CAFE_NAME}</h1>
              <p className="carta-tagline">{CAFE_TAGLINE}</p>
              <div className="carta-ornament">
                <span className="carta-ornament-line" />
                <span className="carta-ornament-mark" aria-hidden="true">
                  ✦
                </span>
                <span className="carta-ornament-line" />
              </div>
            </header>

            <div className="carta-columns">
              {MENU.map((section) => (
                <MenuSectionBlock key={section.id} section={section} />
              ))}
            </div>

            <footer className="carta-footer">
              <p className="carta-footer-brand">{CAFE_NAME}</p>
              <p className="carta-footer-note">{CAFE_FOOTER}</p>
            </footer>
          </div>
        </article>
      </div>
    </div>
  );
}
