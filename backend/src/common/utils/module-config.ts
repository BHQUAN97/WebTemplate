/**
 * Configuration for toggling individual modules on/off.
 */
export interface ModuleConfig {
  [moduleName: string]: {
    enabled: boolean;
    [key: string]: any;
  };
}

/**
 * Default configuration — all 30 modules enabled.
 * Override via environment or config file to disable specific modules.
 */
export const DEFAULT_MODULE_CONFIG: ModuleConfig = {
  // Auth & Users
  auth: { enabled: true },
  users: { enabled: true },
  tenants: { enabled: true },

  // Core
  settings: { enabled: true },
  logs: { enabled: true },
  media: { enabled: true },

  // E-commerce
  products: { enabled: true },
  categories: { enabled: true },
  inventory: { enabled: true },
  cart: { enabled: true },
  orders: { enabled: true },
  payments: { enabled: true },
  reviews: { enabled: true },
  promotions: { enabled: true },

  // CMS
  articles: { enabled: true },
  pages: { enabled: true },
  navigation: { enabled: true },
  seo: { enabled: true },

  // Advanced
  notifications: { enabled: true },
  analytics: { enabled: true },
  search: { enabled: true },
  export: { enabled: true },
  import: { enabled: true },
  i18n: { enabled: true },
  contacts: { enabled: true },
  faq: { enabled: true },

  // SaaS
  plans: { enabled: true },
  apiKeys: { enabled: true },
  webhooks: { enabled: true },
  emailTemplates: { enabled: true },
};

/**
 * Check if a module is enabled in the configuration.
 *
 * @param config - Module configuration object
 * @param moduleName - Name of the module to check
 * @returns true if the module is enabled (defaults to true if not configured)
 */
export function isModuleEnabled(
  config: ModuleConfig,
  moduleName: string,
): boolean {
  const moduleConf = config[moduleName];
  if (!moduleConf) return true; // Module khong co trong config → mac dinh enabled
  return moduleConf.enabled;
}
