export const SERVICE_AREAS = ["Ruaka - Gathigi Estate"];

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "on_the_way",
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
    category: "Supermarket",
    description: "1 litre whole milk for breakfast and tea runs in Gathigi Estate.",
    price: 85,
    image: "/globe.svg",
    unit: "1L pack",
    featured: true,
  },
  {
    name: "Brown Bread",
    slug: "brown-bread",
    category: "Supermarket",
    description: "Soft sliced loaf for quick home restocks.",
    price: 70,
    image: "/file.svg",
    unit: "1 loaf",
    featured: true,
  },
  {
    name: "Eggs",
    slug: "eggs",
    category: "Supermarket",
    description: "Farm eggs packed in trays of six.",
    price: 110,
    image: "/next.svg",
    unit: "6 pack",
    featured: true,
  },
  {
    name: "Pilau Rice",
    slug: "pilau-rice",
    category: "Food",
    description: "Ready meal portion for a quick lunch or dinner order.",
    price: 280,
    image: "/vercel.svg",
    unit: "1 plate",
    featured: false,
  },
  {
    name: "Beef Stew Combo",
    slug: "beef-stew-combo",
    category: "Food",
    description: "Beef stew served with your everyday starch pick.",
    price: 350,
    image: "/window.svg",
    unit: "1 plate",
    featured: false,
  },
  {
    name: "Maize Flour",
    slug: "maize-flour",
    category: "Supermarket",
    description: "2kg unga for ugali and family meals.",
    price: 175,
    image: "/globe.svg",
    unit: "2 kg",
    featured: false,
  },
];
