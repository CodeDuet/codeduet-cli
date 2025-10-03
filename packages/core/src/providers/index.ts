/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

// Types and interfaces
export * from './types.js';

// Core provider classes
export { BaseProvider } from './BaseProvider.js';
export { ApiKeyProvider } from './ApiKeyProvider.js';
export { LocalHttpProvider } from './LocalHttpProvider.js';
export { GoogleOAuthProvider } from './GoogleOAuthProvider.js';
export { LegacyOAuthProvider } from './LegacyOAuthProvider.js';

// Provider management
export { ProviderManager } from './ProviderManager.js';
export { ProviderFactory } from './ProviderFactory.js';
export { ProviderService } from './ProviderService.js';

// Backward compatibility
export { LegacyAuthAdapter } from './LegacyAuthAdapter.js';

// Global provider manager instance
let globalProviderManager: ProviderManager | null = null;

/**
 * Get the global provider manager instance
 */
export function getProviderManager(): ProviderManager {
  if (!globalProviderManager) {
    globalProviderManager = new ProviderManager();
  }
  return globalProviderManager;
}

/**
 * Initialize the global provider manager
 */
export async function initializeProviderManager(): Promise<ProviderManager> {
  const manager = getProviderManager();
  await manager.initialize();
  return manager;
}

/**
 * Get a legacy auth adapter for backward compatibility
 */
export function getLegacyAuthAdapter(): LegacyAuthAdapter {
  const manager = getProviderManager();
  return new LegacyAuthAdapter(manager);
}