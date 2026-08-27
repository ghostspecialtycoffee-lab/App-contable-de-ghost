"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import carta from "@/data/cafe-carta.json";
import { formatMoney } from "@/lib/format";

type CartaItem = {
  name: string;
  price: number;
  note?: string;
};

type CartaSection = {
  id: string;
  title: string;
  tagline: string;
  items: CartaItem[];
};

const sections = carta.sections as CartaSection[];

export function CafeCarta() {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const [scrolled, setScrolled] = useState(false);
  const sectionRefs = useRef<Partial<Record<string, HTMLElement | null>>>({});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.getAttribute("data-section-id");
        if (top) setActiveSection(top);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    for (const section of sections) {
      const node = sectionRefs.current[section.id];
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const node = sectionRefs.current[id];
    if (!node) return;
    const offset = 88;
    const top = node.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const scrollToMenu = useCallback(() => {
    scrollToSection(sections[0]?.id ?? "calientes");
  }, [scrollToSection]);

  return (
    <div className="carta">
      <header className={["carta-topbar", scrolled ? "carta-topbar-solid" : ""].join(" ")}>
        <div className="carta-topbar-inner">
          <p className="carta-topbar-brand">{carta.brand}</p>
          <nav className="carta-topbar-nav" aria-label="Secciones de la carta">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={[
                  "carta-topbar-link",
                  activeSection === section.id ? "is-active" : "",
                ].join(" ")}
                onClick={() => scrollToSection(section.id)}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <section className="carta-hero" aria-label="Portada de la carta">
        <div className="carta-hero-media" aria-hidden="true">
          <img src="/carta-hero.jpg" alt="" className="carta-hero-image" />
          <div className="carta-hero-scrim" />
        </div>
        <div className="carta-hero-content">
          <p className="carta-brand">{carta.brand}</p>
          <h1 className="carta-headline">{carta.tagline}</h1>
          <p className="carta-lede">{carta.subtitle}</p>
          <div className="carta-cta-row">
            <button type="button" className="carta-cta" onClick={scrollToMenu}>
              Ver la carta
            </button>
          </div>
        </div>
      </section>

      <div className="carta-body">
        <nav className="carta-pills" aria-label="Navegación rápida">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={[
                "carta-pill",
                activeSection === section.id ? "is-active" : "",
              ].join(" ")}
              onClick={() => scrollToSection(section.id)}
            >
              {section.title}
            </button>
          ))}
        </nav>

        <div className="carta-sections">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={`carta-${section.id}`}
              data-section-id={section.id}
              ref={(node) => {
                sectionRefs.current[section.id] = node;
              }}
              className="carta-section"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <header className="carta-section-head">
                <h2 className="carta-section-title">{section.title}</h2>
                <p className="carta-section-tagline">{section.tagline}</p>
              </header>

              <ul className="carta-list">
                {section.items.map((item) => (
                  <li key={item.name} className="carta-row">
                    <div className="carta-row-main">
                      <span className="carta-item-name">{item.name}</span>
                      <span className="carta-dots" aria-hidden="true" />
                      <span className="carta-item-price">{formatMoney(item.price)}</span>
                    </div>
                    {item.note ? <p className="carta-item-note">{item.note}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="carta-footer">
          <p>{carta.currencyNote}</p>
          <p className="carta-footer-brand">{carta.brand} · Bienvenido</p>
        </footer>
      </div>
    </div>
  );
}
