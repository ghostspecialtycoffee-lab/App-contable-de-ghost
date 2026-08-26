"use client";

import { useEffect, useRef, useState } from "react";

import {
  CARTA_BRAND,
  CARTA_SECTIONS,
  formatCartaPrice,
  type CartaSection,
} from "@/data/cafe-carta-menu";

function CartaItemRow({
  name,
  price,
  note,
}: {
  name: string;
  price: number;
  note?: string;
}) {
  return (
    <li className="carta-item">
      <div className="carta-item-main">
        <span className="carta-item-name">{name}</span>
        <span className="carta-item-dots" aria-hidden="true" />
        <span className="carta-item-price">{formatCartaPrice(price)}</span>
      </div>
      {note ? <p className="carta-item-note">{note}</p> : null}
    </li>
  );
}

function CartaSectionBlock({
  section,
  index,
}: {
  section: CartaSection;
  index: number;
}) {
  return (
    <section
      id={`carta-${section.id}`}
      className="carta-section"
      style={{ animationDelay: `${0.08 * index}s` }}
    >
      <header className="carta-section-header">
        <h2 className="carta-section-title">{section.title}</h2>
        <p className="carta-section-subtitle">{section.subtitle}</p>
      </header>
      <ul className="carta-item-list">
        {section.items.map((item) => (
          <CartaItemRow
            key={`${section.id}-${item.name}`}
            name={item.name}
            price={item.price}
            note={item.note}
          />
        ))}
      </ul>
    </section>
  );
}

export function CafeCarta() {
  const [activeId, setActiveId] = useState(CARTA_SECTIONS[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = CARTA_SECTIONS.map((section) =>
      document.getElementById(`carta-${section.id}`),
    ).filter((el): el is HTMLElement => Boolean(el));

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target.id) {
          return;
        }
        setActiveId(top.target.id.replace("carta-", ""));
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const activeChip = navRef.current?.querySelector<HTMLElement>(
      `[data-carta-nav="${activeId}"]`,
    );
    activeChip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  return (
    <div className="carta-page">
      <header className="carta-hero">
        <div className="carta-hero-media" aria-hidden="true">
          <img
            src="/images/carta-hero-coffee.jpg"
            alt=""
            className="carta-hero-image"
          />
          <div className="carta-hero-veil" />
        </div>
        <div className="carta-hero-content">
          <p className="carta-hero-kicker">Carta</p>
          <h1 className="carta-hero-brand">{CARTA_BRAND.name}</h1>
          <p className="carta-hero-tagline">{CARTA_BRAND.tagline}</p>
        </div>
      </header>

      <nav className="carta-nav" aria-label="Secciones de la carta" ref={navRef}>
        {CARTA_SECTIONS.map((section) => {
          const isActive = section.id === activeId;
          return (
            <a
              key={section.id}
              href={`#carta-${section.id}`}
              data-carta-nav={section.id}
              className={["carta-nav-link", isActive ? "carta-nav-link-active" : ""].join(
                " ",
              )}
              onClick={(event) => {
                event.preventDefault();
                document
                  .getElementById(`carta-${section.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                setActiveId(section.id);
              }}
            >
              {section.title}
            </a>
          );
        })}
      </nav>

      <div className="carta-sheet">
        {CARTA_SECTIONS.map((section, index) => (
          <CartaSectionBlock key={section.id} section={section} index={index} />
        ))}

        <footer className="carta-footer">
          <p>{CARTA_BRAND.footer}</p>
        </footer>
      </div>
    </div>
  );
}
