export interface CafeMenuItem {
  name: string;
  price: number;
  detail?: string;
}

export interface CafeMenuSection {
  id: string;
  eyebrow: string;
  title: string;
  note: string;
  items: readonly CafeMenuItem[];
}

export const CAFE_MENU_SECTIONS: readonly CafeMenuSection[] = [
  {
    id: "cafes-calientes",
    eyebrow: "De la barra",
    title: "Cafés calientes",
    note: "Preparados al momento con café colombiano.",
    items: [
      { name: "Cappuccino", price: 7_000 },
      { name: "Americano", price: 5_000 },
      { name: "Filtrados exóticos", price: 8_000 },
      { name: "Café latte", price: 7_000 },
      { name: "Aromática tropical", price: 6_000 },
      { name: "Aromática de jengibre y limón", price: 6_000 },
    ],
  },
  {
    id: "acompanantes",
    eyebrow: "Para acompañar",
    title: "Panadería & tortas",
    note: "El complemento perfecto para tu café.",
    items: [
      { name: "Croissant", price: 3_600 },
      { name: "Torta red velvet", price: 7_000 },
      { name: "Torta de chocolate", price: 7_000 },
      { name: "Torta de naranja", price: 7_000 },
    ],
  },
  {
    id: "cafes-frios",
    eyebrow: "Refrescantes",
    title: "Cafés fríos",
    note: "Café, hielo y texturas para cualquier hora.",
    items: [
      { name: "Cold brew", price: 8_000 },
      { name: "Granizado", detail: "10 oz", price: 13_000 },
      { name: "Frappé de café", price: 15_000 },
    ],
  },
  {
    id: "cocteles-bebidas",
    eyebrow: "Summer drinks",
    title: "Cócteles & bebidas",
    note: "Sabores tropicales, café y fruta.",
    items: [
      { name: "Coffee sangría", price: 15_000 },
      { name: "Soda de cereza", price: 9_000 },
      { name: "Soda de la casa", price: 8_000 },
      { name: "Sangría", price: 9_000 },
      { name: "Mojito de naranja", price: 9_000 },
      { name: "Mojito de maracuyá", price: 9_000 },
      { name: "Michelada", price: 7_000 },
      { name: "Michelada de sandía", price: 9_000 },
      { name: "Borojó", price: 9_000 },
      { name: "Borojó cargado", price: 19_000 },
    ],
  },
  {
    id: "desayuno-express",
    eyebrow: "Buenos días",
    title: "Desayuno express",
    note: "Opciones sencillas para comenzar bien.",
    items: [
      { name: "Desayuno del día", price: 11_000 },
      { name: "Desayuno saludable", price: 15_000 },
      { name: "Avena", price: 6_000 },
      { name: "Milo frío o caliente", price: 5_000 },
      { name: "Chocolate", price: 4_000 },
      { name: "Tinto", price: 3_000 },
    ],
  },
  {
    id: "almuerzos-fitness",
    eyebrow: "Cocina ligera",
    title: "Almuerzos fitness",
    note: "Proteína, vegetales y ensalada del día.",
    items: [
      {
        name: "Pollo y verduras en salsa",
        detail: "400 g · incluye ensalada",
        price: 17_000,
      },
      {
        name: "Carne de res y verduras en salsa",
        detail: "400 g · incluye ensalada",
        price: 17_000,
      },
      { name: "Batido fitness", price: 9_000 },
    ],
  },
];
