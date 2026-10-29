/**
 * Category metadata drives navigation, category pages and category-specific
 * filters. Adding a category means adding an entry here and a row in the
 * categories table — no new page components are needed.
 */
export type CategoryIcon =
  | "smartphone"
  | "laptop"
  | "headphones"
  | "shirt"
  | "footprints"
  | "cooking-pot"
  | "plug"
  | "sparkles";

/** Variant attributes that can be used as filters, with display labels. */
export const ATTRIBUTE_LABELS = {
  storage: "Storage",
  ram: "RAM",
  color: "Colour",
  size: "Size",
  capacity: "Capacity",
} as const;

export type FilterableAttribute = keyof typeof ATTRIBUTE_LABELS;
export const FILTERABLE_ATTRIBUTES = Object.keys(ATTRIBUTE_LABELS) as FilterableAttribute[];

export interface CategoryDefinition {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: CategoryIcon;
  /** Variant attributes that are meaningful filters within this category. */
  filters: FilterableAttribute[];
  /**
   * Attributes that must match exactly before two listings in this category
   * can be treated as the same product.
   */
  identityAttributes: FilterableAttribute[];
}

export const CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
  {
    slug: "mobiles",
    name: "Mobiles & Tablets",
    shortName: "Mobiles",
    description: "Smartphones and tablets compared by exact storage and colour variant.",
    icon: "smartphone",
    filters: ["storage", "color"],
    identityAttributes: ["storage", "color"],
  },
  {
    slug: "laptops",
    name: "Laptops & Computers",
    shortName: "Laptops",
    description: "Laptops and desktops compared by exact processor, RAM and storage configuration.",
    icon: "laptop",
    filters: ["ram", "storage"],
    identityAttributes: ["ram", "storage"],
  },
  {
    slug: "audio",
    name: "Audio & Headphones",
    shortName: "Audio",
    description: "Headphones, earbuds and speakers.",
    icon: "headphones",
    filters: ["color"],
    identityAttributes: ["color"],
  },
  {
    slug: "fashion",
    name: "Fashion & Clothing",
    shortName: "Fashion",
    description: "Clothing compared only within the same size and colour.",
    icon: "shirt",
    filters: ["size", "color"],
    identityAttributes: ["size", "color"],
  },
  {
    slug: "footwear",
    name: "Footwear",
    shortName: "Footwear",
    description: "Shoes and sandals compared only within the same size and colour.",
    icon: "footprints",
    filters: ["size", "color"],
    identityAttributes: ["size", "color"],
  },
  {
    slug: "home-kitchen",
    name: "Home & Kitchen",
    shortName: "Home",
    description: "Appliances, cookware and home essentials.",
    icon: "cooking-pot",
    filters: ["capacity", "color"],
    identityAttributes: ["capacity"],
  },
  {
    slug: "electronics",
    name: "Electronics & Accessories",
    shortName: "Electronics",
    description: "Chargers, cables, smart devices and other accessories.",
    icon: "plug",
    filters: ["color"],
    identityAttributes: [],
  },
  {
    slug: "beauty",
    name: "Beauty & Personal Care",
    shortName: "Beauty",
    description: "Grooming, skincare and personal care products.",
    icon: "sparkles",
    filters: ["capacity"],
    identityAttributes: ["capacity"],
  },
];

const BY_SLUG = new Map(CATEGORY_DEFINITIONS.map((c) => [c.slug, c]));

export function getCategoryDefinition(slug: string): CategoryDefinition | undefined {
  return BY_SLUG.get(slug);
}
