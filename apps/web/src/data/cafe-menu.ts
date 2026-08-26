export interface CafeMenuItem {
  name: string;
  price: number;
  detail?: string;
}

export interface CafeMenuSection {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  items: CafeMenuItem[];
}

export const CAFE_MENU_SECTIONS: CafeMenuSection[] = [
  {
    id: "cafes-calientes",
    number: "01",
    eyebrow: "De la barra",
    title: "Cafés calientes",
    description: "Clásicos de espresso, filtrados e infusiones.",
    items: [
      { name: "Capuchino", price: 7000 },
      { name: "Americano", price: 5000 },
      { name: "Filtrados exóticos", price: 8000 },
      { name: "Café latte", price: 7000 },
      { name: "Aromática tropical", price: 6000 },
      { name: "Aromática de jengibre y limón", price: 6000 },
    ],
  },
  {
    id: "acompanantes",
    number: "02",
    eyebrow: "Algo dulce",
    title: "Acompañantes",
    description: "Para acompañar el café o cerrar la visita.",
    items: [
      { name: "Croissant", price: 3600 },
      { name: "Torta red velvet", price: 7000 },
      { name: "Torta de chocolate", price: 7000 },
      { name: "Torta de naranja", price: 7000 },
    ],
  },
  {
    id: "cafes-frios",
    number: "03",
    eyebrow: "Con hielo",
    title: "Cafés fríos",
    description: "Café refrescante para cualquier momento del día.",
    items: [
      { name: "Cold brew", price: 8000 },
      { name: "Granizado", detail: "10 onzas", price: 13000 },
      { name: "Frappé de café", price: 15000 },
    ],
  },
  {
    id: "summer",
    number: "04",
    eyebrow: "Barra refrescante",
    title: "Cócteles y bebidas summer",
    description: "Mezclas de la casa, sodas y sabores tropicales.",
    items: [
      { name: "Coffee sangría", price: 15000 },
      { name: "Soda cereza", price: 9000 },
      { name: "Soda de la casa", price: 8000 },
      { name: "Sangría", price: 9000 },
      { name: "Mojito de naranja", price: 9000 },
      { name: "Mojito de maracuyá", price: 9000 },
      { name: "Michelada", price: 7000 },
      { name: "Michelada de sandía", price: 9000 },
      { name: "Borojó", price: 9000 },
      { name: "Borojó cargado", price: 19000 },
    ],
  },
  {
    id: "desayuno",
    number: "05",
    eyebrow: "Para comenzar",
    title: "Desayuno exprés",
    description: "Opciones sencillas para empezar bien el día.",
    items: [
      { name: "Desayuno del día", price: 11000 },
      { name: "Desayuno saludable", price: 15000 },
      { name: "Avena", price: 6000 },
      { name: "Milo", detail: "Frío o caliente", price: 5000 },
      { name: "Chocolate", price: 4000 },
      { name: "Tinto", price: 3000 },
    ],
  },
  {
    id: "almuerzos",
    number: "06",
    eyebrow: "Cocina ligera",
    title: "Almuerzos fitness",
    description: "Platos completos con proteína, verduras y ensalada.",
    items: [
      {
        name: "Pollo y verduras en salsa",
        detail: "400 g · ensalada del día",
        price: 17000,
      },
      {
        name: "Carne de res y verduras en salsa",
        detail: "400 g · ensalada del día",
        price: 17000,
      },
      { name: "Batido fitness", price: 9000 },
    ],
  },
];
