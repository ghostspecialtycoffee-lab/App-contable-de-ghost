"use client";

import { useEffect, useState } from "react";

import {
  CARTA_BRAND,
  CARTA_SECTIONS,
  formatCartaPrice,
  type CartaSection,
} from "@/data/cafe-carta";

function SectionBlock({ section, index }: { section: CartaSection; index: number }) {
  return (
    <section
      id={section.id}
      className="carta-section"
      style={{ animationDelay: `${0.08 + index * 0.05}s` }}
    >
      <header className="carta-section-head">
        <h2 className="carta-section-title">{section.title}</h2>
        {section.subtitle ? <p className="carta-section-sub">{section.subtitle}</p> : null}
      </header>
      <ul className="carta-list">
        {section.items.map((item) => (
          <li key={item.name} className="carta-row">
            <div className="carta-row-main">
              <span className="carta-item-name">{item.name}</span>
              <span className="carta-leader" aria-hidden="true" />
              <span className="carta-item-price">{formatCartaPrice(item.price)}</span>
            </div>
            {item.note ? <p className="carta-item-note">{item.note}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CafeCarta() {
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setNavReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="carta-root">
      <div className="carta-atmosphere" aria-hidden="true" />

      <header className="carta-hero">
        <div className="carta-hero-plane" aria-hidden="true" />
        <div className="carta-hero-inner">
          <p className="carta-brand">{CARTA_BRAND.name}</p>
          <h1 className="carta-headline">Carta</h1>
          <p className="carta-lede">{CARTA_BRAND.tagline}</p>
          <div className="carta-hero-actions">
            <a href={`#${CARTA_SECTIONS[0]?.id ?? "cafes-calientes"}`} className="carta-cta">
              Ver menú
            </a>
            <button type="button" className="carta-cta-ghost" onClick={() => window.print()}>
              Imprimir
            </button>
          </div>
        </div>
      </header>

      <nav
        className={["carta-nav", navReady ? "carta-nav-ready" : ""].join(" ")}
        aria-label="Categorías de la carta"
      >
        <div className="carta-nav-track">
          {CARTA_SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="carta-nav-link">
              {section.title}
            </a>
          ))}
        </div>
      </nav>

      <main className="carta-sheet">
        <div className="carta-sheet-rule" aria-hidden="true" />
        {CARTA_SECTIONS.map((section, index) => (
          <SectionBlock key={section.id} section={section} index={index} />
        ))}
        <footer className="carta-footer">
          <p>{CARTA_BRAND.footer}</p>
        </footer>
      </main>
    </div>
  );
}
