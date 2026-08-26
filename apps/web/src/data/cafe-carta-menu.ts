export interface CartaItem {
  name: string;
  price: number;
  note?: string;
}

export interface CartaSection {
  id: string;
  title: string;
  subtitle: string;
  items: CartaItem[];
}

/** Carta pública — precios en COP. */
export const CARTA_BRAND = {
  name: "Ghost Specialty Coffee",
  tagline: "Café de especialidad · carta del día",
  footer: "Precios en pesos colombianos (COP). Pregunta por opciones del día.",
} as const;

export const CARTA_SECTIONS: CartaSection[] = [
  {
    id: "calientes",
    title: "Cafés calientes",
    subtitle: "Espresso, filtrados e infusiones de la casa",
    items: [
      { name: "Capuchino", price: 7000 },
      { name: "Americano", price: 5000 },
      { name: "Filtrados exóticos", price: 8000 },
      { name: "Café Latte", price: 7000 },
      { name: "Aromática tropical", price: 6000 },
      { name: "Aromática jengibre / limón", price: 6000 },
    ],
  },
  {
    id: "acompanantes",
    title: "Acompañantes",
    subtitle: "Para acompañar tu bebida",
    items: [
      { name: "Croissant", price: 3600 },
      { name: "Torta Red velvet", price: 7000 },
      { name: "Torta Chocolate", price: 7000 },
      { name: "Torta de Naranja", price: 7000 },
    ],
  },
  {
    id: "frios",
    title: "Cafés fríos",
    subtitle: "Cold brew, granizados y frappés",
    items: [
      { name: "Cold brew", price: 8000 },
      { name: "Granizados", price: 13000, note: "10 oz" },
      { name: "Frappé de café", price: 15000 },
    ],
  },
  {
    id: "summer",
    title: "Cócteles y bebidas summer",
    subtitle: "Refrescantes de temporada",
    items: [
      { name: "Cóctel Coffee sangría", price: 15000 },
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
    title: "Desayuno express",
    subtitle: "Para empezar el día con calma",
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
    title: "Almuerzos fitness",
    subtitle: "Porciones generosas con ensalada del día",
    items: [
      {
        name: "Pollo y verduras en salsa",
        price: 17000,
        note: "400 g · ensalada del día",
      },
      {
        name: "Carne de res y verduras en salsa",
        price: 17000,
        note: "400 g · ensalada del día",
      },
      { name: "Batidos fitness", price: 9000 },
    ],
  },
];

export function formatCartaPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
