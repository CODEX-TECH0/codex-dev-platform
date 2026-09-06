// Single source of truth for the app/product version. Do not hard-code
// version strings anywhere else in the UI — import PRODUCT_VERSION instead.
//
// Versioning policy: "V1" is the product's first major version. Development,
// staging/beta, and production are all still V1 — moving from beta to
// production is NOT a version bump. Only an actual breaking change to the
// product/API would justify a V2, at which point the API would move from
// /v1/ to /v2/ (see docs: API Versioning) while the old /v1/ continues to
// work for existing integrations.
export const PRODUCT_NAME = 'Codex';
export const PRODUCT_VERSION = 'V1';
export const PRODUCT_STAGE = (import.meta.env.VITE_APP_ENV === 'production' ? 'Production' : 'Public Beta') as
  | 'Production'
  | 'Public Beta'
  | 'Development';
export const API_VERSION = 'v1';
