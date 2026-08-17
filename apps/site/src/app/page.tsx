import Link from "next/link";
import menuData from "@/data/menu.json";
import social from "@/data/social-stats.json";

type MenuItem = { name: string; price: number; desc?: string };
type MenuCategory = { id: string; name: string; items: MenuItem[] };

function formatCop(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function HomePage() {
  const categories = (menuData.categories ?? []) as MenuCategory[];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-cement-2/40 bg-paper-warm/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="font-display text-lg tracking-wide text-ink sm:text-xl">
            GHOST
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm">
            <a href="#menu" className="rounded-full border border-cement-2/50 bg-paper px-3 py-1.5 text-cement-5 hover:border-wood-4">
              Menú
            </a>
            <a href="#sede" className="rounded-full border border-cement-2/50 bg-paper px-3 py-1.5 text-cement-5 hover:border-wood-4">
              Sede
            </a>
            <a href="#redes" className="rounded-full border border-cement-2/50 bg-paper px-3 py-1.5 text-cement-5 hover:border-wood-4">
              Redes
            </a>
            <a
              href="https://www.instagram.com/ghost_specialty_coffee/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-ink px-3 py-1.5 text-paper"
            >
              Instagram
            </a>
          </nav>
        </div>
      </header>

      {/* Hero — brand first, one composition */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, #4a4845 0%, #2a2a2a 42%, #111111 100%)",
          }}
        />
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(201,176,138,0.12) 48px, rgba(201,176,138,0.12) 49px)",
          }}
        />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-wood-3">
              Brunch · Lunch · Coffee lab
            </p>
            <h1 className="font-display text-4xl leading-[1.05] text-paper sm:text-5xl lg:text-6xl">
              Ghost Specialty Coffee
            </h1>
            <p className="mt-5 max-w-md text-base text-cement-2 sm:text-lg">
              Café de especialidad SCA 85+ en el primer piso de Bit Hotels El Peñón.
              Origen verificable. Tostado artesanal en Cali.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#menu"
                className="rounded-full bg-wood-3 px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-wood-2"
              >
                Ver menú
              </a>
              <a
                href="#sede"
                className="rounded-full border border-cement-3 px-5 py-2.5 text-sm font-bold text-paper hover:border-wood-3"
              >
                Cómo llegar
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <img
              src="/logo-wordmark-dark.svg"
              alt="Ghost Specialty Coffee"
              className="mx-auto w-full max-w-sm"
            />
            <p className="mt-4 text-center text-xs tracking-wide text-cement-2">
              Cl. 1 Oe. #2-61 · El Peñón, Cali · 302 515 9900
            </p>
          </div>
        </div>
      </section>

      {/* Social stats */}
      <section id="redes" className="border-b border-cement-2/30 bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-wood-5">
            Redes · snapshot {social.snapshotDate}
          </p>
          <h2 className="mt-2 font-display text-3xl text-ink">
            {social.handle} en Instagram
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-cement-4">
            Métricas públicas de la cuenta de la cafetería. Base para la propuesta de
            administración de redes del hotel (@bit.hotels).
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Seguidores" value={social.metrics.followers.toLocaleString("es-CO")} />
            <Stat label="Publicaciones" value={social.metrics.posts.toLocaleString("es-CO")} />
            <Stat label="Siguiendo" value={social.metrics.following.toLocaleString("es-CO")} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a
              href={social.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-wood-5 underline-offset-4 hover:underline"
            >
              Abrir Instagram Ghost →
            </a>
            <a
              href={social.hotelPartner.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-cement-4 underline-offset-4 hover:underline"
            >
              {social.hotelPartner.handle} (hotel) →
            </a>
          </div>
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-wood-5">Carta</p>
        <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Menú Ghost</h2>
        <p className="mt-2 max-w-2xl text-sm text-cement-4">
          Precios al público (COP). Huéspedes Bit Hotels: desayuno hotel según tarifa B2B
          acordada ($13.500) — incluye opción vegetariana y waflebono.
        </p>

        <div className="mt-10 space-y-10">
          {categories.map((cat) => (
            <div key={cat.id}>
              <h3 className="border-b border-cement-2/50 pb-2 font-display text-xl text-ink">
                {cat.name}
              </h3>
              <ul className="mt-3 divide-y divide-cement-1">
                {cat.items.map((item) => (
                  <li
                    key={item.name}
                    className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3"
                  >
                    <span className="font-semibold text-ink">{item.name}</span>
                    <span className="font-display text-ink">{formatCop(item.price)}</span>
                    {item.desc ? (
                      <span className="col-span-2 text-sm text-cement-4">{item.desc}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Sede */}
      <section id="sede" className="border-t border-cement-2/30 bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-wood-3">Sede</p>
            <h2 className="mt-2 font-display text-3xl">Bit Hotels El Peñón</h2>
            <p className="mt-4 text-cement-2">
              Operamos en el primer piso del hotel, alineados al lenguaje visual del coworking
              (~80%) con firma Ghost en madera prensada, negro y grises cemento.
            </p>
            <dl className="mt-8 space-y-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-cement-3">Dirección</dt>
                <dd className="mt-1 font-semibold">Cl. 1 Oe. #2-61 · Barrio El Peñón · Cali</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-cement-3">Teléfono</dt>
                <dd className="mt-1 font-semibold">
                  <a href="tel:+573025159900" className="hover:text-wood-3">
                    302 515 9900
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-cement-3">Email</dt>
                <dd className="mt-1 font-semibold">
                  <a href="mailto:ghostspecialtycoffee@gmail.com" className="hover:text-wood-3">
                    ghostspecialtycoffee@gmail.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-cement-3">Ecosistema F&amp;B</dt>
                <dd className="mt-1 text-cement-2">
                  Complementamos Turk House, Chef Burger y Baraka con coffee lab &amp; brunch specialty.
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-white/10 bg-cement-5/40 p-6">
            <h3 className="font-display text-xl text-wood-3">Para Bit Hotels</h3>
            <ul className="mt-4 space-y-2 text-sm text-cement-1">
              <li>· Desayunos huésped $13.500 (buffet · opción vegetariana · waflebono)</li>
              <li>· Cápsulas $1.700 · drips $2.000</li>
              <li>· Café red 5 lb $125.000 / paquete</li>
              <li>· Contenido &amp; redes plan aliado</li>
              <li>· Deducibilidad cafetería ↔ hotel</li>
            </ul>
            <a
              href="https://bithotels.co/hotel-el-penon/"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block text-sm font-bold text-wood-3 underline-offset-4 hover:underline"
            >
              Ver hotel en bithotels.co →
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-cement-2/40 bg-paper-warm">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-cement-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Ghost Specialty Coffee · Cali</p>
          <p>SCA 85+ · ghostspecialtycoffee.co · @Ghost_Specialty_Coffee</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cement-2/40 bg-paper-warm px-5 py-6">
      <p className="text-xs font-bold uppercase tracking-wider text-cement-4">{label}</p>
      <p className="mt-2 font-display text-4xl text-ink">{value}</p>
    </div>
  );
}
