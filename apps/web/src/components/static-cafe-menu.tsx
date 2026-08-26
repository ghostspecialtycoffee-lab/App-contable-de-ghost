import { CAFE_MENU_SECTIONS } from "@/data/cafe-menu";

import styles from "./static-cafe-menu.module.css";

const priceFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

function CoffeeEmblem() {
  return (
    <svg
      className={styles.emblem}
      viewBox="0 0 180 180"
      role="img"
      aria-label="Ilustración de una taza de café"
    >
      <path d="M49 65h73v42c0 22-14 37-36 37S49 129 49 107V65Z" />
      <path d="M122 78h9c16 0 24 8 24 20s-9 20-27 20h-8" />
      <path d="M63 45c0-10 8-12 8-22M88 45c0-10 8-12 8-22M113 45c0-10 8-12 8-22" />
      <path d="M38 146h98" />
    </svg>
  );
}

export function StaticCafeMenu() {
  return (
    <div className={styles.page}>
      <article className={styles.menu}>
        <header className={styles.hero}>
          <div className={styles.topline}>
            <p className={styles.wordmark}>Ghost Specialty Coffee</p>
            <p className={styles.edition}>Carta de la casa</p>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Café · cocina · coctelería</p>
              <h1 className={styles.title}>
                Una pausa,
                <span>bien servida.</span>
              </h1>
              <p className={styles.intro}>
                Café colombiano, sabores frescos y cocina honesta para disfrutar sin prisa.
              </p>
            </div>

            <div className={styles.emblemWrap}>
              <CoffeeEmblem />
              <p>Preparado al momento</p>
            </div>
          </div>

          <nav className={styles.sectionNav} aria-label="Secciones de la carta">
            {CAFE_MENU_SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>
        </header>

        <main className={styles.content}>
          <div className={styles.sectionGrid}>
            {CAFE_MENU_SECTIONS.map((section, sectionIndex) => (
              <section
                className={styles.section}
                id={section.id}
                key={section.id}
                aria-labelledby={`${section.id}-title`}
              >
                <header className={styles.sectionHeader}>
                  <span className={styles.sectionNumber}>
                    {String(sectionIndex + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className={styles.sectionEyebrow}>{section.eyebrow}</p>
                    <h2 id={`${section.id}-title`}>{section.title}</h2>
                    <p className={styles.sectionNote}>{section.note}</p>
                  </div>
                </header>

                <ul className={styles.itemList}>
                  {section.items.map((item) => (
                    <li key={`${section.id}-${item.name}`} className={styles.item}>
                      <div className={styles.itemCopy}>
                        <span className={styles.itemName}>{item.name}</span>
                        {item.detail ? <span className={styles.itemDetail}>{item.detail}</span> : null}
                      </div>
                      <span className={styles.leader} aria-hidden="true" />
                      <span
                        className={styles.price}
                        aria-label={`${priceFormatter.format(item.price)} pesos`}
                      >
                        {priceFormatter.format(item.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </main>

        <footer className={styles.footer}>
          <div>
            <p className={styles.footerMark}>G</p>
            <p>
              <strong>Hecho con calma.</strong>
              <span> Servido con intención.</span>
            </p>
          </div>
          <p>Precios en pesos colombianos · Productos sujetos a disponibilidad</p>
        </footer>
      </article>
    </div>
  );
}
