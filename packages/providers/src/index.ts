import { DemoProvider } from "./demo/demo-provider";
import { ProviderRegistry } from "./registry";

export * from "./types";
export * from "./normalize";
export * from "./registry";
export * from "./matching";
export * from "./history";
export * from "./refresh";
export { DemoProvider } from "./demo/demo-provider";
export { AffiliateApiTemplateProvider } from "./adapters/affiliate-api.template";

export interface RegistryEnv {
  /** Include the demo provider (default true). Disable for production without demo data. */
  enableDemo?: boolean;
}

/**
 * Builds the registry from configuration. Real providers are added here only
 * once an authorised integration exists and its credentials are present.
 */
export function createDefaultRegistry(env: RegistryEnv = {}): ProviderRegistry {
  const registry = new ProviderRegistry();
  if (env.enableDemo !== false) registry.register(new DemoProvider());
  return registry;
}
