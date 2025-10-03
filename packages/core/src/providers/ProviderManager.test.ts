/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ProviderManager } from './ProviderManager.js';
import { AuthProvider, ProviderConfig } from './types.js';

// Mock credential manager
vi.mock('../utils/credentialManager.js', () => ({
  credentialManager: {
    getCredential: vi.fn().mockResolvedValue(null),
    setCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
    isSecureStorageAvailable: vi.fn().mockResolvedValue(true),
    getStorageType: vi.fn().mockReturnValue('mock'),
    migrateFromEnvironment: vi.fn().mockResolvedValue(false),
  },
}));

describe('ProviderManager', () => {
  let providerManager: ProviderManager;

  beforeEach(() => {
    providerManager = new ProviderManager();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize without errors', async () => {
      await expect(providerManager.initialize()).resolves.not.toThrow();
    });

    test('should have providers after initialization', async () => {
      await providerManager.initialize();
      const providers = providerManager.getAllProviders();
      expect(providers.size).toBeGreaterThan(0);
    });
  });

  describe('Provider Registration', () => {
    test('should register API key provider', async () => {
      const config: ProviderConfig = {
        type: AuthProvider.API_KEY,
        name: 'test-openai',
        displayName: 'Test OpenAI',
        enabled: true,
        model: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
      };

      await providerManager.registerProvider(config);
      const provider = providerManager.getProvider('test-openai');
      
      expect(provider).toBeDefined();
      expect(provider?.type).toBe(AuthProvider.API_KEY);
      expect(provider?.name).toBe('test-openai');
    });

    test('should register local HTTP provider', async () => {
      const config: ProviderConfig = {
        type: AuthProvider.LOCAL_HTTP,
        name: 'test-ollama',
        displayName: 'Test Ollama',
        enabled: true,
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
      };

      await providerManager.registerProvider(config);
      const provider = providerManager.getProvider('test-ollama');
      
      expect(provider).toBeDefined();
      expect(provider?.type).toBe(AuthProvider.LOCAL_HTTP);
      expect(provider?.name).toBe('test-ollama');
    });

    test('should register Google OAuth provider', async () => {
      const config: ProviderConfig = {
        type: AuthProvider.GOOGLE_OAUTH,
        name: 'test-google',
        displayName: 'Test Google',
        enabled: true,
        additionalConfig: { authMode: 'oauth' },
      };

      await providerManager.registerProvider(config);
      const provider = providerManager.getProvider('test-google');
      
      expect(provider).toBeDefined();
      expect(provider?.type).toBe(AuthProvider.GOOGLE_OAUTH);
      expect(provider?.name).toBe('test-google');
    });

    test('should register legacy OAuth provider', async () => {
      const config: ProviderConfig = {
        type: AuthProvider.LEGACY_OAUTH,
        name: 'test-qwen',
        displayName: 'Test Qwen',
        enabled: true,
      };

      await providerManager.registerProvider(config);
      const provider = providerManager.getProvider('test-qwen');
      
      expect(provider).toBeDefined();
      expect(provider?.type).toBe(AuthProvider.LEGACY_OAUTH);
      expect(provider?.name).toBe('test-qwen');
    });
  });

  describe('Provider Management', () => {
    beforeEach(async () => {
      const config: ProviderConfig = {
        type: AuthProvider.API_KEY,
        name: 'test-provider',
        displayName: 'Test Provider',
        enabled: true,
        model: 'test-model',
      };
      await providerManager.registerProvider(config);
    });

    test('should set active provider', async () => {
      await providerManager.setActiveProvider('test-provider');
      const activeProvider = providerManager.getActiveProvider();
      
      expect(activeProvider).toBeDefined();
      expect(activeProvider?.name).toBe('test-provider');
    });

    test('should get providers by type', () => {
      const apiKeyProviders = providerManager.getProvidersByType(AuthProvider.API_KEY);
      expect(apiKeyProviders.length).toBeGreaterThan(0);
      expect(apiKeyProviders[0].type).toBe(AuthProvider.API_KEY);
    });

    test('should remove provider', async () => {
      await providerManager.removeProvider('test-provider');
      const provider = providerManager.getProvider('test-provider');
      expect(provider).toBeUndefined();
    });
  });

  describe('Provider Templates', () => {
    test('should create provider from template', () => {
      const provider = providerManager.createProviderFromTemplate('openai');
      expect(provider.type).toBe(AuthProvider.API_KEY);
      expect(provider.name).toBe('openai');
    });

    test('should get available templates', () => {
      const templates = providerManager.getAvailableTemplates();
      expect(templates).toContain('openai');
      expect(templates).toContain('anthropic');
      expect(templates).toContain('ollama');
    });
  });

  describe('Provider Statistics', () => {
    test('should get provider stats', async () => {
      await providerManager.initialize();
      const stats = providerManager.getProviderStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byType).toBeDefined();
      expect(stats.enabled).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid provider name', async () => {
      await expect(
        providerManager.setActiveProvider('nonexistent-provider')
      ).rejects.toThrow();
    });

    test('should handle invalid provider configuration', async () => {
      const invalidConfig = {
        type: 'invalid-type' as AuthProvider,
        name: 'invalid',
        displayName: 'Invalid',
        enabled: true,
      };

      await expect(
        providerManager.registerProvider(invalidConfig)
      ).rejects.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all providers', async () => {
      await providerManager.initialize();
      await providerManager.cleanup();
      
      const providers = providerManager.getAllProviders();
      expect(providers.size).toBe(0);
      
      const activeProvider = providerManager.getActiveProvider();
      expect(activeProvider).toBeNull();
    });
  });
});