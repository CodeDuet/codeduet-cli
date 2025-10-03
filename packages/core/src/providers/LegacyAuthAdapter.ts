/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProviderManager } from './ProviderManager.js';
import {
  LegacyAuthType,
  LEGACY_AUTH_TYPE_MAPPING,
  ProviderValidationResult,
} from './types.js';

/**
 * Backward compatibility adapter for legacy AuthType system
 * Maintains API compatibility while delegating to new provider system
 */
export class LegacyAuthAdapter {
  constructor(private providerManager: ProviderManager) {}

  /**
   * Validate legacy auth method - backward compatible API
   */
  async validateAuthMethod(authMethod: string): Promise<string | null> {
    try {
      // Convert string to LegacyAuthType if possible
      const legacyAuthType = authMethod as LegacyAuthType;
      
      // Validate using new provider system
      const result = await this.providerManager.validateLegacyAuthMethod(legacyAuthType);
      
      // Convert result to legacy format (null = valid, string = error)
      return result.isValid ? null : result.error || 'Authentication method validation failed';
    } catch (error) {
      return error instanceof Error ? error.message : 'Unknown validation error';
    }
  }

  /**
   * Set active provider using legacy auth type
   */
  async setAuthMethod(authMethod: string): Promise<void> {
    const legacyAuthType = authMethod as LegacyAuthType;
    const providerName = this.providerManager.mapLegacyAuthTypeToProvider(legacyAuthType);
    
    if (!providerName) {
      throw new Error(`Legacy auth method '${authMethod}' is not supported`);
    }

    await this.providerManager.setActiveProvider(providerName);
  }

  /**
   * Get active auth method in legacy format
   */
  getActiveAuthMethod(): string | null {
    const activeProvider = this.providerManager.getActiveProvider();
    if (!activeProvider) {
      return null;
    }

    // Map back to legacy auth type
    return this.mapProviderToLegacyAuthType(activeProvider.name);
  }

  /**
   * Legacy credential setting functions - delegate to provider system
   */
  async setOpenAIApiKey(apiKey: string): Promise<void> {
    await this.providerManager.setProviderCredentials('openai', { apiKey });
  }

  async setOpenAIBaseUrl(baseUrl: string): Promise<void> {
    await this.providerManager.setProviderCredentials('openai', { baseUrl });
  }

  async setAnthropicApiKey(apiKey: string): Promise<void> {
    await this.providerManager.setProviderCredentials('anthropic', { apiKey });
  }

  async setGeminiApiKey(apiKey: string): Promise<void> {
    await this.providerManager.setProviderCredentials('gemini', { apiKey });
  }

  async setGrokApiKey(apiKey: string): Promise<void> {
    await this.providerManager.setProviderCredentials('grok', { apiKey });
  }

  async setRunPodApiKey(apiKey: string): Promise<void> {
    await this.providerManager.setProviderCredentials('runpod', { apiKey });
  }

  async setRunPodBaseUrl(baseUrl: string): Promise<void> {
    await this.providerManager.setProviderCredentials('runpod', { baseUrl });
  }

  /**
   * Legacy environment variable setting functions
   */
  setOllamaBaseUrl(baseUrl: string): void {
    process.env.OLLAMA_BASE_URL = baseUrl;
    // Also update provider configuration if it exists
    this.updateProviderConfig('ollama', { baseUrl });
  }

  setOllamaModel(model: string): void {
    process.env.OLLAMA_MODEL = model;
    this.updateProviderConfig('ollama', { model });
  }

  setLmStudioBaseUrl(baseUrl: string): void {
    process.env.LM_STUDIO_BASE_URL = baseUrl;
    this.updateProviderConfig('lm-studio', { baseUrl });
  }

  setLmStudioModel(model: string): void {
    process.env.LM_STUDIO_MODEL = model;
    this.updateProviderConfig('lm-studio', { model });
  }

  /**
   * Legacy validation functions that map to new provider validation
   */
  async validateOpenAI(): Promise<ProviderValidationResult> {
    const provider = this.providerManager.getProvider('openai');
    return provider ? await provider.validate() : { isValid: false, error: 'OpenAI provider not found' };
  }

  async validateAnthropic(): Promise<ProviderValidationResult> {
    const provider = this.providerManager.getProvider('anthropic');
    return provider ? await provider.validate() : { isValid: false, error: 'Anthropic provider not found' };
  }

  async validateGemini(): Promise<ProviderValidationResult> {
    const provider = this.providerManager.getProvider('gemini');
    return provider ? await provider.validate() : { isValid: false, error: 'Gemini provider not found' };
  }

  async validateVertexAI(): Promise<ProviderValidationResult> {
    const provider = this.providerManager.getProvider('vertex-ai');
    return provider ? await provider.validate() : { isValid: false, error: 'Vertex AI provider not found' };
  }

  async validateOllama(): Promise<ProviderValidationResult> {
    const provider = this.providerManager.getProvider('ollama');
    return provider ? await provider.validate() : { isValid: false, error: 'Ollama provider not found' };
  }

  async validateLmStudio(): Promise<ProviderValidationResult> {
    const provider = this.providerManager.getProvider('lm-studio');
    return provider ? await provider.validate() : { isValid: false, error: 'LM Studio provider not found' };
  }

  /**
   * Get legacy auth types that are available
   */
  getAvailableAuthMethods(): string[] {
    const availableProviders = this.providerManager.getAllProviders();
    const legacyMethods: string[] = [];

    for (const [providerName] of availableProviders) {
      const legacyType = this.mapProviderToLegacyAuthType(providerName);
      if (legacyType) {
        legacyMethods.push(legacyType);
      }
    }

    return Array.from(new Set(legacyMethods)); // Remove duplicates
  }

  /**
   * Get migration recommendations for legacy auth methods
   */
  getMigrationRecommendations(authMethod: string): string[] {
    const recommendations: string[] = [];
    const legacyAuthType = authMethod as LegacyAuthType;
    const newProviderType = LEGACY_AUTH_TYPE_MAPPING[legacyAuthType];

    if (!newProviderType) {
      recommendations.push(`Legacy auth method '${authMethod}' is no longer supported.`);
      recommendations.push('Please use one of the supported providers:');
      recommendations.push('• OpenAI API (openai)');
      recommendations.push('• Anthropic API (anthropic)');
      recommendations.push('• Google OAuth (google-oauth)');
      recommendations.push('• Local providers (ollama, lm-studio)');
      return recommendations;
    }

    switch (legacyAuthType) {
      case LegacyAuthType.USE_OPENAI:
        recommendations.push('OpenAI authentication is now handled by the unified API key provider.');
        recommendations.push('Your existing OPENAI_API_KEY will continue to work.');
        break;
      case LegacyAuthType.USE_ANTHROPIC:
        recommendations.push('Anthropic authentication is now handled by the unified API key provider.');
        recommendations.push('Your existing ANTHROPIC_API_KEY will continue to work.');
        break;
      case LegacyAuthType.USE_GEMINI:
        recommendations.push('Gemini authentication is now handled by the unified API key provider.');
        recommendations.push('Your existing GEMINI_API_KEY will continue to work.');
        break;
      case LegacyAuthType.LOGIN_WITH_GOOGLE:
      case LegacyAuthType.USE_VERTEX_AI:
      case LegacyAuthType.CLOUD_SHELL:
        recommendations.push('Google services are now handled by the unified Google OAuth provider.');
        recommendations.push('OAuth tokens and project configurations will be preserved.');
        break;
      case LegacyAuthType.USE_OLLAMA:
      case LegacyAuthType.USE_LM_STUDIO:
        recommendations.push('Local HTTP providers now have enhanced connection testing and model discovery.');
        recommendations.push('Your existing base URL and model configurations will continue to work.');
        break;
      case LegacyAuthType.QWEN_OAUTH:
        recommendations.push('⚠️  Qwen OAuth is deprecated and will be removed in a future version.');
        recommendations.push('Consider migrating to:');
        recommendations.push('• Ollama with local Qwen models');
        recommendations.push('• Another supported API provider');
        break;
    }

    return recommendations;
  }

  /**
   * Helper: Map provider name to legacy auth type
   */
  private mapProviderToLegacyAuthType(providerName: string): string | null {
    const mapping: Record<string, LegacyAuthType> = {
      'openai': LegacyAuthType.USE_OPENAI,
      'anthropic': LegacyAuthType.USE_ANTHROPIC,
      'gemini': LegacyAuthType.USE_GEMINI,
      'grok': LegacyAuthType.USE_GROK,
      'runpod': LegacyAuthType.USE_RUNPOD,
      'ollama': LegacyAuthType.USE_OLLAMA,
      'lm-studio': LegacyAuthType.USE_LM_STUDIO,
      'google-oauth': LegacyAuthType.LOGIN_WITH_GOOGLE,
      'vertex-ai': LegacyAuthType.USE_VERTEX_AI,
      'cloud-shell': LegacyAuthType.CLOUD_SHELL,
      'qwen-oauth': LegacyAuthType.QWEN_OAUTH,
    };

    return mapping[providerName] || null;
  }

  /**
   * Helper: Update provider configuration
   */
  private updateProviderConfig(providerName: string, updates: { baseUrl?: string; model?: string }): void {
    const provider = this.providerManager.getProvider(providerName);
    if (provider) {
      if (updates.baseUrl) {
        provider.config.baseUrl = updates.baseUrl;
      }
      if (updates.model) {
        provider.config.model = updates.model;
      }
    }
  }

  /**
   * Migrate from legacy auth configuration to new provider system
   */
  async migrateFromLegacyConfig(): Promise<{ migrated: string[]; errors: string[] }> {
    const migrated: string[] = [];
    const errors: string[] = [];

    // Auto-detect available providers from environment
    try {
      const detected = await this.providerManager.autoDetectProviders();
      migrated.push(...detected);
    } catch (error) {
      errors.push(`Auto-detection failed: ${error}`);
    }

    return { migrated, errors };
  }

  /**
   * Check if migration is needed
   */
  needsMigration(): boolean {
    // Check for legacy environment variables
    const legacyEnvVars = [
      'GEMINI_MODEL',
      'OPENAI_MODEL', 
      'ANTHROPIC_MODEL',
      'QWEN_OAUTH_CLIENT_ID',
      'QWEN_OAUTH_CLIENT_SECRET',
    ];

    return legacyEnvVars.some(envVar => process.env[envVar]);
  }
}