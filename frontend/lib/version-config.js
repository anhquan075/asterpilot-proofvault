// Feature flag system for V1/V2 version switching
// Set VITE_VAULT_VERSION=v1 or VITE_VAULT_VERSION=v2 in .env
// Default: v2

export const VAULT_VERSION = import.meta.env.VITE_VAULT_VERSION || 'v2';
export const IS_V1 = VAULT_VERSION === 'v1';
export const IS_V2 = VAULT_VERSION === 'v2';
