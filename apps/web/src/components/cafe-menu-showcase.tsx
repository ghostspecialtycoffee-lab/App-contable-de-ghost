import { CAFE_MENU_SECTIONS, type CafeMenuSection } from "@/data/cafe-menu";

import styles from "./cafe-menu-showcase.module.css";

const priceFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

function formatCafePrice(value: number): string {
  return `$ ${priceFormatter.format(value)}`;
}

function CoffeeMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M12.3 9.2c5.8-4 13.7-2.5 17.6 3.2s2.5 13.6-3.2 17.5-13.6 2.5-17.5-3.2S6.5 13 12.3 9.2Z" />
      <path d="M27.8 9.7c-2 1.4-3.6 3.3-4.4 5.6-.8 2.2-.8 4.6-.1 6.9.7 2.3.6 4.8-.3 7.1" />
      <path d="M10.2 29.1c2-1.4 3.6-3.3 4.4-5.6.8-2.2.8-4.7.1-6.9-.7-2.3-.6-4.8.3-7.1" />
    </svg>
  );
}

function CoffeeCupIllustration() {
  return (
    <svg viewBox="0 0 300 270" aria-hidden="true">
      <path d="M86 99h126v73c0 40-28 65-63 65s-63-25-63-65V99Z" />
      <path d="M212 118h17c23 0 35 13 35 32s-12 32-35 32h-18" />
      <path d="M63 237h173" />
      <path d="M112 72c-10-14 13-19 3-34" />
      <path d="M149 72c-10-14 13-19 3-34" />
      <path d="M186 72c-10-14 13-19 3-34" />
      <path d="M105 122c28 11 57 11 86 0" />
    </svg>
  );
}

function MenuSection({ section }: { section: CafeMenuSection }) {
  return (
    <section
      id={section.id}
      className={styles.menuSection}
      aria-labelledby={`${section.id}-title`}
    >
      <div className={styles.sectionHeading}>
        <span className={styles.sectionNumber}>{section.number}</span>
        <div>
          <p className={styles.sectionEyebrow}>{section.eyebrow}</p>
          <h2 id={`${section.id}-title`} className={styles.sectionTitle}>
            {section.title}
          </h2>
          <p className={styles.sectionDescription}>{section.description}</p>
        </div>
      </div>

      <ul className={styles.itemList}>
        {section.items.map((item) => (
          <li key={`${section.id}-${item.name}`} className={styles.menuItem}>
            <div className={styles.itemLine}>
              <span className={styles.itemName}>{item.name}</span>
              <span className={styles.itemRule} aria-hidden="true" />
              <span className={styles.itemPrice}>{formatCafePrice(item.price)}</span>
            </div>
            {item.detail ? <p className={styles.itemDetail}>{item.detail}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CafeMenuShowcase() {
  return (
    <div className={styles.page}>
      <div className={styles.topbar} role="banner">
        <div className={styles.topbarInner}>
          <a href="#carta" className={styles.brand} aria-label="Ghost Specialty Coffee, ir a la carta">
            <span className={styles.brandMark}>
              <CoffeeMark />
            </span>
            <span>
              <span className={styles.brandName}>Ghost</span>
              <span className={styles.brandDescriptor}>Specialty Coffee</span>
            </span>
          </a>
          <p className={styles.topbarNote}>Café · cocina · barra</p>
        </div>
      </div>

      <main id="carta" className={styles.main}>
        <div className={styles.menuSheet}>
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Carta de la casa</p>
              <h1 className={styles.heroTitle}>Café para quedarse.</h1>
              <p className={styles.heroText}>
                Una selección directa y honesta: cafés calientes y fríos, desayunos, cocina
                ligera y bebidas para bajar el ritmo.
              </p>
              <div className={styles.menuFacts} aria-label="Información de la carta">
                <span>32 opciones</span>
                <span>6 secciones</span>
                <span>Precios en COP</span>
              </div>
            </div>

            <div className={styles.heroArt}>
              <span className={styles.artLabel}>Preparado al momento</span>
              <CoffeeCupIllustration />
              <span className={styles.artCaption}>Una pausa bien servida</span>
            </div>
          </div>

          <nav className={styles.categoryNav} aria-label="Secciones de la carta">
            {CAFE_MENU_SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`} className={styles.categoryLink}>
                <span>{section.number}</span>
                {section.title}
              </a>
            ))}
          </nav>

          <div className={styles.menuColumns}>
            {CAFE_MENU_SECTIONS.map((section) => (
              <MenuSection key={section.id} section={section} />
            ))}
          </div>

          <div className={styles.closingNote}>
            <CoffeeMark />
            <p>
              <span>Gracias por visitarnos.</span>
              Consulta con nuestro equipo la disponibilidad del día.
            </p>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>Ghost Specialty Coffee</p>
          <span aria-hidden="true">·</span>
          <p>Hecho para disfrutar sin afán</p>
        </footer>
      </main>
    </div>
  );
}
