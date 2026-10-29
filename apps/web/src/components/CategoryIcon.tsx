import { CookingPot, Footprints, Headphones, Laptop, Package, Plug, Shirt, Smartphone, Sparkles, type LucideProps } from "lucide-react";
import { getCategoryDefinition, type CategoryIcon as IconKey } from "@pricedekho/shared";

const ICONS: Record<IconKey, typeof Package> = {
  smartphone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  shirt: Shirt,
  footprints: Footprints,
  "cooking-pot": CookingPot,
  plug: Plug,
  sparkles: Sparkles,
};

export function CategoryIcon({ slug, ...props }: { slug: string } & LucideProps) {
  const def = getCategoryDefinition(slug);
  const Icon = def ? ICONS[def.icon] : Package;
  return <Icon aria-hidden {...props} />;
}
