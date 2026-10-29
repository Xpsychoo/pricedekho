import { existsSync } from "node:fs";
import { join } from "node:path";
import { DEMO_PRODUCTS } from "@pricedekho/shared/demo";

describe("demo product illustrations", () => {
  it.each(DEMO_PRODUCTS.map((p) => [p.slug, p.imageUrl]))("%s has a bundled image", (_slug, imageUrl) => {
    expect(imageUrl).toMatch(/^\/demo-images\/[a-z0-9-]+\.svg$/);
    expect(existsSync(join(__dirname, "..", "public", imageUrl))).toBe(true);
  });
});
