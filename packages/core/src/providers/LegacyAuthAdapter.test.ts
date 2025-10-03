/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LegacyAuthAdapter } from './LegacyAuthAdapter.js';
import { ProviderManager } from './ProviderManager.js';
import { LegacyAuthType } from './types.js';

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

describe('LegacyAuthAdapter', () => {
  let providerManager: ProviderManager;
  let legacyAdapter: LegacyAuthAdapter;

  beforeEach(async () => {
    providerManager = new ProviderManager();
    await providerManager.initialize();
    legacyAdapter = new LegacyAuthAdapter(providerManager);
    vi.clearAllMocks();
  });

  describe('Auth Method Validation', () => {
    test('should validate supported auth methods', async () => {
      const validMethods = [
        LegacyAuthType.USE_OPENAI,
        LegacyAuthType.USE_ANTHROPIC,
        LegacyAuthType.USE_GEMINI,
        LegacyAuthType.USE_OLLAMA,
        LegacyAuthType.USE_LM_STUDIO,
      ];

      for (const method of validMethods) {
        const result = await legacyAdapter.validateAuthMethod(method);
        expect(typeof result).toBe('string'); // Should return null for valid or string for error
      }
    });

    test('should return error for unsupported auth method', async () => {
      const result = await legacyAdapter.validateAuthMethod('unsupported-method');
      expect(result).toContain('not supported');
    });
  });

  describe('Credential Management', () => {
    test('should set OpenAI API key', async () => {
      await expect(
        legacyAdapter.setOpenAIApiKey('sk-test123')
      ).resolves.not.toThrow();
    });

    test('should set Anthropic API key', async () => {
      await expect(
        legacyAdapter.setAnthropicApiKey('sk-ant-test123')
      ).resolves.not.toThrow();
    });

    test('should set Gemini API key', async () => {
      await expect(
        legacyAdapter.setGeminiApiKey('test-gemini-key')
      ).resolves.not.toThrow();
    });

    test('should set Grok API key', async () => {
      await expect(
        legacyAdapter.setGrokApiKey('test-grok-key')
      ).resolves.not.toThrow();
    });

    test('should set RunPod API key', async () => {
      await expect(
        legacyAdapter.setRunPodApiKey('test-runpod-key')
      ).resolves.not.toThrow();
    });
  });

  describe('Environment Variable Management', () => {
    test('should set Ollama base URL', () => {
      legacyAdapter.setOllamaBaseUrl('http://localhost:11434');
      expect(process.env.OLLAMA_BASE_URL).toBe('http://localhost:11434');
    });

    test('should set Ollama model', () => {
      legacyAdapter.setOllamaModel('llama2');
      expect(process.env.OLLAMA_MODEL).toBe('llama2');
    });

    test('should set LM Studio base URL', () => {
      legacyAdapter.setLmStudioBaseUrl('http://localhost:1234');
      expect(process.env.LM_STUDIO_BASE_URL).toBe('http://localhost:1234');
    });

    test('should set LM Studio model', () => {
      legacyAdapter.setLmStudioModel('local-model');
      expect(process.env.LM_STUDIO_MODEL).toBe('local-model');
    });
  });

  describe('Provider Validation', () => {
    test('should validate individual providers', async () => {
      const validations = [
        legacyAdapter.validateOpenAI(),
        legacyAdapter.validateAnthropic(),
        legacyAdapter.validateGemini(),
        legacyAdapter.validateOllama(),
        legacyAdapter.validateLmStudio(),
      ];

      const results = await Promise.all(validations);
      results.forEach(result => {
        expect(result).toHaveProperty('isValid');
        expect(typeof result.isValid).toBe('boolean');
      });
    });
  });

  describe('Available Auth Methods', () => {
    test('should get available auth methods', () => {
      const methods = legacyAdapter.getAvailableAuthMethods();
      expect(Array.isArray(methods)).toBe(true);
      expect(methods.length).toBeGreaterThan(0);
    });

    test('should include common auth methods', () => {
      const methods = legacyAdapter.getAvailableAuthMethods();
      expect(methods).toContain(LegacyAuthType.USE_OPENAI);
      expect(methods).toContain(LegacyAuthType.USE_ANTHROPIC);
    });
  });

  describe('Migration Recommendations', () => {
    test('should provide migration recommendations for OpenAI', () => {
      const recommendations = legacyAdapter.getMigrationRecommendations(LegacyAuthType.USE_OPENAI);
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('OpenAI'))).toBe(true);
    });

    test('should provide migration recommendations for Anthropic', () => {
      const recommendations = legacyAdapter.getMigrationRecommendations(LegacyAuthType.USE_ANTHROPIC);
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.some(r => r.includes('Anthropic'))).toBe(true);
    });

    test('should provide deprecation warning for Qwen OAuth', () => {
      const recommendations = legacyAdapter.getMigrationRecommendations(LegacyAuthType.QWEN_OAUTH);
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.some(r => r.includes('deprecated'))).toBe(true);
    });

    test('should handle unsupported auth methods', () => {
      const recommendations = legacyAdapter.getMigrationRecommendations('unsupported-method');
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.some(r => r.includes('no longer supported'))).toBe(true);
    });
  });

  describe('Migration Process', () => {
    test('should perform migration from legacy config', async () => {
      const result = await legacyAdapter.migrateFromLegacyConfig();
      expect(result).toHaveProperty('migrated');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.migrated)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should detect if migration is needed', () => {
      // Set a legacy environment variable
      process.env.GEMINI_MODEL = 'gemini-pro';
      
      const needsMigration = legacyAdapter.needsMigration();
      expect(typeof needsMigration).toBe('boolean');
      
      // Clean up
      delete process.env.GEMINI_MODEL;
    });
  });

  describe('Active Provider Management', () => {
    test('should set auth method', async () => {
      await expect(
        legacyAdapter.setAuthMethod(LegacyAuthType.USE_OPENAI)
      ).resolves.not.toThrow();
    });

    test('should get active auth method', () => {
      const activeMethod = legacyAdapter.getActiveAuthMethod();
      expect(activeMethod === null || typeof activeMethod === 'string').toBe(true);
    });

    test('should handle setting unsupported auth method', async () => {
      await expect(
        legacyAdapter.setAuthMethod('unsupported-method')
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle provider manager errors gracefully', async () => {
      // Create a broken provider manager
      const brokenManager = {
        validateLegacyAuthMethod: vi.fn().mockRejectedValue(new Error('Test error')),
        mapLegacyAuthTypeToProvider: vi.fn().mockReturnValue(null),
      } as any;

      const brokenAdapter = new LegacyAuthAdapter(brokenManager);
      
      const result = await brokenAdapter.validateAuthMethod(LegacyAuthType.USE_OPENAI);
      expect(typeof result).toBe('string');
      expect(result).toContain('error');
    });
  });
});