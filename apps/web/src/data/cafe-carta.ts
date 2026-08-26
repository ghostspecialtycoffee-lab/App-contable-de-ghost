/** Carta operativa de cafetería — precios en COP. */

export interface CartaItem {
  name: string;
  price: number;
  note?: string;
}

export interface CartaSection {
  id: string;
  title: string;
  subtitle?: string;
  items: CartaItem[];
}

export const CARTA_BRAND = {
  name: "Ghost Coffee",
  tagline: "Especialidad · cocina ligera · barra",
  footer: "Precios en pesos colombianos. Pregunta por disponibilidad del día.",
} as const;

export const CARTA_SECTIONS: CartaSection[] = [
  {
    id: "cafes-calientes",
    title: "Cafés calientes",
    subtitle: "Espresso, filtrados e infusiones",
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
    id: "cafes-frios",
    title: "Cafés fríos",
    subtitle: "Cold brew y bebidas heladas",
    items: [
      { name: "Cold brew", price: 8000 },
      { name: "Granizados 10 onzas", price: 13000 },
      { name: "Frappé de café", price: 15000 },
    ],
  },
  {
    id: "cocteles-summer",
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
    id: "desayuno-express",
    title: "Desayuno express",
    subtitle: "Listo para empezar el día",
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
    id: "almuerzos-fitness",
    title: "Almuerzos fitness",
    subtitle: "Porción generosa con ensalada del día",
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
  return `$ ${price.toLocaleString("es-CO")}`;
}
