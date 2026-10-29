/**
 * DEMO CATALOG — SAMPLE DATA ONLY.
 *
 * Every store, offer and price in this file is fictional and exists only to
 * demonstrate the interface. Stores use the reserved `.example` domain, offers
 * have source "demo" and lastCheckedAt null (they were never verified).
 * Product names refer to real models so the matching and variant logic can be
 * exercised, but the prices are not real and must never be shown as such.
 *
 * supabase/seed.sql is generated from this file:
 *   pnpm seed:generate
 */
import type { OfferAvailability } from "../schemas/enums";
import { buildVariantKey, normalizeVariantAttributes } from "../utils/variants";

export interface DemoCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface DemoStore {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string;
}

export interface DemoOffer {
  id: string;
  storeId: string;
  externalProductId: string;
  productUrl: string;
  sellerName: string;
  pricePaise: number;
  originalPricePaise: number | null;
  availability: OfferAvailability;
}

export interface DemoProduct {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  description: string;
  specifications: Record<string, string>;
  variantAttributes: Record<string, string>;
  variantKey: string;
  offers: DemoOffer[];
}

export const DEMO_PROVIDER_ID = "demo";

/** Fixed creation time so generated SQL and tests are deterministic. */
export const DEMO_CREATED_AT = "2026-10-29T00:00:00.000Z";

const uuid = (group: string, n: number) => `00000000-0000-4000-${group}-${n.toString(16).padStart(12, "0")}`;

export const DEMO_CATEGORIES: DemoCategory[] = [
  ["mobiles", "Mobiles & Tablets", "Smartphones and tablets compared by exact storage and colour variant."],
  ["laptops", "Laptops & Computers", "Laptops and desktops compared by exact processor, RAM and storage configuration."],
  ["audio", "Audio & Headphones", "Headphones, earbuds and speakers."],
  ["fashion", "Fashion & Clothing", "Clothing compared only within the same size and colour."],
  ["footwear", "Footwear", "Shoes and sandals compared only within the same size and colour."],
  ["home-kitchen", "Home & Kitchen", "Appliances, cookware and home essentials."],
  ["electronics", "Electronics & Accessories", "Chargers, cables, smart devices and other accessories."],
  ["beauty", "Beauty & Personal Care", "Grooming, skincare and personal care products."],
].map(([slug, name, description], i) => ({ id: uuid("a000", i + 1), slug: slug!, name: name!, description: description! }));

export const DEMO_STORES: DemoStore[] = [
  { id: uuid("b000", 1), slug: "demo-store-alpha", name: "Demo Store Alpha", websiteUrl: "https://alpha.demo-store.example" },
  { id: uuid("b000", 2), slug: "demo-store-beta", name: "Demo Store Beta", websiteUrl: "https://beta.demo-store.example" },
  { id: uuid("b000", 3), slug: "demo-store-gamma", name: "Demo Store Gamma", websiteUrl: "https://gamma.demo-store.example" },
];

const categoryId = (slug: string) => DEMO_CATEGORIES.find((c) => c.slug === slug)!.id;

interface ProductInput {
  category: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  description: string;
  specifications: Record<string, string>;
  variant: Record<string, string>;
  /** Demo prices in paise per store index; null = store has no listing. */
  prices: Array<
    | null
    | { price: number; original?: number; availability?: OfferAvailability }
  >;
}

const PRODUCTS: ProductInput[] = [
  {
    category: "mobiles",
    slug: "apple-iphone-13-128gb-midnight",
    name: "Apple iPhone 13 (128GB, Midnight)",
    brand: "Apple",
    model: "iPhone 13",
    description: "6.1-inch Super Retina XDR display, A15 Bionic chip, dual 12MP camera system.",
    specifications: { Display: "6.1-inch OLED", Processor: "A15 Bionic", "Rear camera": "12MP + 12MP", "Front camera": "12MP" },
    variant: { storage: "128GB", color: "Midnight" },
    prices: [{ price: 5_211_100, original: 5_911_100 }, { price: 5_244_400 }, { price: 5_299_900, availability: "limited" }],
  },
  {
    category: "mobiles",
    slug: "apple-iphone-13-256gb-midnight",
    name: "Apple iPhone 13 (256GB, Midnight)",
    brand: "Apple",
    model: "iPhone 13",
    description: "6.1-inch Super Retina XDR display, A15 Bionic chip, dual 12MP camera system.",
    specifications: { Display: "6.1-inch OLED", Processor: "A15 Bionic", "Rear camera": "12MP + 12MP", "Front camera": "12MP" },
    variant: { storage: "256GB", color: "Midnight" },
    prices: [{ price: 6_211_100 }, null, { price: 6_188_800, availability: "out_of_stock" }],
  },
  {
    category: "mobiles",
    slug: "samsung-galaxy-s23-128gb-phantom-black",
    name: "Samsung Galaxy S23 5G (8GB RAM, 128GB, Phantom Black)",
    brand: "Samsung",
    model: "Galaxy S23",
    description: "6.1-inch Dynamic AMOLED 2X display with a 50MP triple camera.",
    specifications: { Display: "6.1-inch AMOLED, 120Hz", RAM: "8GB", Battery: "3900 mAh", "Rear camera": "50MP + 12MP + 10MP" },
    variant: { storage: "128GB", color: "Phantom Black", ram: "8GB" },
    prices: [{ price: 4_511_100, original: 5_111_100 }, { price: 4_477_700 }, { price: 4_533_300 }],
  },
  {
    category: "laptops",
    slug: "lenovo-ideapad-slim-3-16gb-512gb",
    name: "Lenovo IdeaPad Slim 3 (Intel Core i5, 16GB RAM, 512GB SSD)",
    brand: "Lenovo",
    model: "IdeaPad Slim 3",
    description: "15.6-inch Full HD thin and light laptop.",
    specifications: { Display: "15.6-inch FHD", Processor: "Intel Core i5", OS: "Windows 11 Home", Weight: "1.6 kg" },
    variant: { ram: "16GB", storage: "512GB" },
    prices: [{ price: 5_811_100 }, { price: 5_755_500 }, null],
  },
  {
    category: "laptops",
    slug: "apple-macbook-air-m2-8gb-256gb",
    name: "Apple MacBook Air M2 (8GB RAM, 256GB SSD, Midnight)",
    brand: "Apple",
    model: "MacBook Air M2",
    description: "13.6-inch Liquid Retina display, Apple M2 chip.",
    specifications: { Display: "13.6-inch Liquid Retina", Processor: "Apple M2", Weight: "1.24 kg" },
    variant: { ram: "8GB", storage: "256GB", color: "Midnight" },
    prices: [{ price: 8_911_100 }, { price: 8_866_600, original: 9_911_100 }, { price: 8_999_900 }],
  },
  {
    category: "audio",
    slug: "sony-wh-1000xm5-black",
    name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones (Black)",
    brand: "Sony",
    model: "WH-1000XM5",
    description: "Over-ear wireless headphones with active noise cancellation.",
    specifications: { Type: "Over-ear", Connectivity: "Bluetooth 5.2", "Battery life": "Up to 30 hours" },
    variant: { color: "Black" },
    prices: [{ price: 2_611_100 }, { price: 2_644_400 }, { price: 2_588_800 }],
  },
  {
    category: "audio",
    slug: "jbl-tune-510bt-blue",
    name: "JBL Tune 510BT Wireless On-Ear Headphones (Blue)",
    brand: "JBL",
    model: "Tune 510BT",
    description: "Lightweight on-ear Bluetooth headphones.",
    specifications: { Type: "On-ear", Connectivity: "Bluetooth 5.0", "Battery life": "Up to 40 hours" },
    variant: { color: "Blue" },
    prices: [{ price: 311_100 }, null, { price: 299_900 }],
  },
  {
    category: "footwear",
    slug: "campus-north-plus-running-shoes-uk-9-black",
    name: "Campus North Plus Men's Running Shoes (UK 9, Black)",
    brand: "Campus",
    model: "North Plus",
    description: "Lightweight mesh running shoes.",
    specifications: { Upper: "Mesh", Sole: "EVA", Closure: "Lace-up" },
    variant: { size: "UK 9", color: "Black" },
    prices: [{ price: 151_100 }, { price: 144_400, original: 211_100 }, null],
  },
  {
    category: "fashion",
    slug: "allen-solly-mens-polo-t-shirt-m-navy",
    name: "Allen Solly Men's Regular Fit Polo T-Shirt (M, Navy)",
    brand: "Allen Solly",
    model: "Regular Fit Polo",
    description: "Cotton blend polo t-shirt.",
    specifications: { Fabric: "Cotton blend", Fit: "Regular", Sleeve: "Short" },
    variant: { size: "M", color: "Navy" },
    prices: [{ price: 81_100 }, { price: 77_700 }, { price: 84_400 }],
  },
  {
    category: "home-kitchen",
    slug: "prestige-svachh-pressure-cooker-5l",
    name: "Prestige Svachh Aluminium Pressure Cooker (5 L)",
    brand: "Prestige",
    model: "Svachh",
    description: "Outer-lid pressure cooker with spillage control.",
    specifications: { Material: "Aluminium", Compatibility: "Gas and induction" },
    variant: { capacity: "5 L" },
    prices: [{ price: 211_100 }, { price: 205_500 }, null],
  },
  {
    category: "electronics",
    slug: "anker-20w-usb-c-charger",
    name: "Anker 20W USB-C Fast Charger (White)",
    brand: "Anker",
    model: "PowerPort III 20W",
    description: "Compact USB-C power delivery wall charger.",
    specifications: { Output: "20W USB-C PD", Ports: "1 × USB-C" },
    variant: { color: "White" },
    prices: [{ price: 111_100 }, { price: 108_800 }, { price: 114_400 }],
  },
  {
    category: "beauty",
    slug: "nivea-soft-moisturising-cream-300ml",
    name: "Nivea Soft Light Moisturising Cream (300 ml)",
    brand: "Nivea",
    model: "Soft",
    description: "Light moisturising cream with jojoba oil and vitamin E.",
    specifications: { "Skin type": "All", Form: "Cream" },
    variant: { capacity: "300 ml" },
    prices: [{ price: 41_100 }, null, { price: 38_800 }],
  },
];

export const DEMO_PRODUCTS: DemoProduct[] = PRODUCTS.map((p, productIndex) => {
  const variantAttributes = normalizeVariantAttributes(p.variant);
  const variantKey = buildVariantKey(variantAttributes);
  const productId = uuid("c000", productIndex + 1);
  const offers: DemoOffer[] = [];
  p.prices.forEach((entry, storeIndex) => {
    if (!entry) return;
    const store = DEMO_STORES[storeIndex]!;
    const externalProductId = `DEMO-${productIndex + 1}-${storeIndex + 1}`;
    offers.push({
      id: uuid("d000", (productIndex + 1) * 10 + storeIndex + 1),
      storeId: store.id,
      externalProductId,
      productUrl: `${store.websiteUrl}/p/${p.slug}`,
      sellerName: `${store.name} Seller (Demo)`,
      pricePaise: entry.price,
      originalPricePaise: entry.original ?? null,
      availability: entry.availability ?? "in_stock",
    });
  });
  return {
    id: productId,
    categoryId: categoryId(p.category),
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    model: p.model,
    description: p.description,
    specifications: p.specifications,
    variantAttributes,
    variantKey,
    offers,
  };
});

/** Popular searches shown on the homepage. Demo data — not real search trends. */
export const DEMO_TRENDING_SEARCHES = ["iPhone 13", "Galaxy S23", "MacBook Air", "noise cancelling headphones", "running shoes"];
