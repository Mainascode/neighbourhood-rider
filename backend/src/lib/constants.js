export const SERVICE_AREAS = ["Ruaka", "Gachie", "Gathiga"];

export const ORDER_STATUSES = [
  "pending",
  "purchased",
  "on_delivery",
  "delivered",
  "cancelled",
];

export const PAYMENT_STATUSES = [
  "pending",
  "initiated",
  "paid",
  "failed",
];

export const WEATHER_TYPES = ["sunny", "rainy"];

export const DEFAULT_PRODUCTS = [
  {
    name: "Fresh Milk",
    slug: "fresh-milk",
    category: "Dairy",
    description: "1 litre whole milk for daily breakfast runs.",
    price: 85,
    image: "/globe.svg",
    unit: "1L pack",
    featured: true,
  },
  {
    name: "Brown Bread",
    slug: "brown-bread",
    category: "Bakery",
    description: "Soft sliced loaf from the neighborhood bakery.",
    price: 70,
    image: "/file.svg",
    unit: "1 loaf",
    featured: true,
  },
  {
    name: "Eggs",
    slug: "eggs",
    category: "Breakfast",
    description: "Farm eggs packed in trays of six.",
    price: 110,
    image: "/next.svg",
    unit: "6 pack",
    featured: true,
  },
  {
    name: "Bananas",
    slug: "bananas",
    category: "Fruits",
    description: "Sweet ripe bananas for quick snacks.",
    price: 95,
    image: "/vercel.svg",
    unit: "1 bunch",
    featured: false,
  },
  {
    name: "Tomatoes",
    slug: "tomatoes",
    category: "Vegetables",
    description: "Fresh red tomatoes for home cooking.",
    price: 80,
    image: "/window.svg",
    unit: "1 kg",
    featured: false,
  },
  {
    name: "Maize Flour",
    slug: "maize-flour",
    category: "Staples",
    description: "2kg unga for ugali and family meals.",
    price: 175,
    image: "/globe.svg",
    unit: "2 kg",
    featured: false,
  },
];
