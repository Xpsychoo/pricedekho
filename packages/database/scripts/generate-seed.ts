import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generateSeedSql } from "../src/seed";

const target = fileURLToPath(new URL("../../../supabase/seed.sql", import.meta.url));
writeFileSync(target, generateSeedSql(), "utf8");
console.warn(`Wrote ${target}`);
