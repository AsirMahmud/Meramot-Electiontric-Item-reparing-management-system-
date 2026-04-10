import type { Shop } from "./api";

export const fallbackShops: Shop[] = [
  {
    id: "1",
    name: "Device Doctor",
    rating: 4.9,
    reviews: 322,
    distanceKm: 1.3,
    averagePrice: 2,
    heroTag: "Fast motherboard repair",
  },
  {
    id: "2",
    name: "FixHub BD",
    rating: 4.7,
    reviews: 198,
    distanceKm: 2.1,
    averagePrice: 1,
    heroTag: "Free diagnosis this week",
  },
  {
    id: "3",
    name: "Spare Square",
    rating: 4.8,
    reviews: 276,
    distanceKm: 3.4,
    averagePrice: 3,
    heroTag: "Popular laptop parts",
  },
  {
    id: "4",
    name: "Green Repair Lab",
    rating: 4.6,
    reviews: 145,
    distanceKm: 4,
    averagePrice: 2,
    heroTag: "Pickup in under 30 min",
  },
];

export const offerCards = [
  {
    title: "Free pickup on your first repair",
    subtitle: "Use code MERAMOTNEW to save the courier fee today.",
  },
  {
    title: "Laptop battery week",
    subtitle: "Selected vendors are offering up to 15% off original cells.",
  },
];

export const popularCategories = [
  { label: "Phone", sprite: "📱", trend: "High screen repair demand" },
  { label: "Laptop", sprite: "💻", trend: "Battery and keyboard issues" },
  { label: "Tablet", sprite: "🧾", trend: "Port replacement trending" },
  { label: "Smartwatch", sprite: "⌚", trend: "Glass and strap repairs" },
  { label: "Gaming Console", sprite: "🎮", trend: "Fan cleaning rising" },
  { label: "Printer", sprite: "🖨️", trend: "Roller and cartridge requests" },
];

export const recentlyViewed = [
  "MacBook Air M2 battery replacement",
  "iPhone 13 display set",
  "ThinkPad keyboard repair",
  "Samsung S23 charging port fix",
];
