/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IProvider,
  IProviderFactory,
  IProviderService,
  AuthProvider,
  ProviderConfig,
  PROVIDER_TEMPLATES,
} from './types.js';
import { ApiKeyProvider } from './ApiKeyProvider.js';
import { LocalHttpProvider } from './LocalHttpProvider.js';
import { GoogleOAuthProvider } from './GoogleOAuthProvider.js';
import { LegacyOAuthProvider } from './LegacyOAuthProvider.js';

/**
 * Factory for creating provider instances
 * Handles instantiation of the appropriate provider type
 */
export class ProviderFactory implements IProviderFactory {
  constructor(private providerService: IProviderService) {}

  createProvider(config: ProviderConfig): IProvider {
    this.validateConfig(config);

    switch (config.type) {
      case AuthProvider.API_KEY:
        return new ApiKeyProvider(config, this.providerService);
      
      case AuthProvider.LOCAL_HTTP:
        return new LocalHttpProvider(config, this.providerService);
      
      case AuthProvider.GOOGLE_OAUTH:
        return new GoogleOAuthProvider(config, this.providerService);
      
      case AuthProvider.LEGACY_OAUTH:
        return new LegacyOAuthProvider(config, this.providerService);
      
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  getSupportedTypes(): AuthProvider[] {
    return [
      AuthProvider.API_KEY,
      AuthProvider.LOCAL_HTTP,
      AuthProvider.GOOGLE_OAUTH,
      AuthProvider.LEGACY_OAUTH,
    ];
  }

  /**
   * Create a provider from a template
   */
  createFromTemplate(templateName: string, overrides: Partial<ProviderConfig> = {}): IProvider {
    const template = PROVIDER_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Provider template '${templateName}' not found`);
    }

    const config: ProviderConfig = {
      enabled: true,
      ...template,
      ...overrides,
      name: overrides.name || template.name || templateName,
      displayName: overrides.displayName || template.displayName || templateName,
      type: overrides.type || template.type!,
    };

    return this.createProvider(config);
  }

  /**
   * Get available provider templates
   */
  getAvailableTemplates(): string[] {
    return Object.keys(PROVIDER_TEMPLATES);
  }

  /**
   * Get template configuration
   */
  getTemplate(templateName: string): Partial<ProviderConfig> | undefined {
    return PROVIDER_TEMPLATES[templateName];
  }

  /**
   * Validate provider configuration
   */
  private validateConfig(config: ProviderConfig): void {
    if (!config.name) {
      throw new Error('Provider configuration must have a name');
    }

    if (!config.type) {
      throw new Error('Provider configuration must have a type');
    }

    if (!this.getSupportedTypes().includes(config.type)) {
      throw new Error(`Unsupported provider type: ${config.type}`);
    }

    // Type-specific validation
    this.validateTypeSpecificConfig(config);
  }

  private validateTypeSpecificConfig(config: ProviderConfig): void {
    switch (config.type) {
      case AuthProvider.API_KEY:
        this.validateApiKeyConfig(config);
        break;
      case AuthProvider.LOCAL_HTTP:
        this.validateLocalHttpConfig(config);
        break;
      case AuthProvider.GOOGLE_OAUTH:
        this.validateGoogleOAuthConfig(config);
        break;
      case AuthProvider.LEGACY_OAUTH:
        this.validateLegacyOAuthConfig(config);
        break;
    }
  }

  private validateApiKeyConfig(config: ProviderConfig): void {
    // API key providers should have a model specified
    if (!config.model) {
      throw new Error(`API key provider '${config.name}' must specify a model`);
    }

    // Validate known API key providers
    const knownProviders = ['openai', 'anthropic', 'gemini', 'grok', 'runpod'];
    if (knownProviders.includes(config.name)) {
      this.validateKnownApiKeyProvider(config);
    }
  }

  private validateKnownApiKeyProvider(config: ProviderConfig): void {
    switch (config.name) {
      case 'runpod':
        if (!config.baseUrl) {
          throw new Error('RunPod provider requires a baseUrl');
        }
        break;
      // Other providers have optional baseUrl with defaults
    }
  }

  private validateLocalHttpConfig(config: ProviderConfig): void {
    if (!config.baseUrl) {
      throw new Error(`Local HTTP provider '${config.name}' must specify a baseUrl`);
    }

    try {
      const url = new URL(config.baseUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`Local HTTP provider '${config.name}' baseUrl must use HTTP or HTTPS protocol`);
      }
    } catch (error) {
      throw new Error(`Local HTTP provider '${config.name}' has invalid baseUrl: ${error}`);
    }
  }

  private validateGoogleOAuthConfig(config: ProviderConfig): void {
    const authMode = config.additionalConfig?.authMode;
    if (authMode && !['oauth', 'vertex-ai', 'cloud-shell'].includes(authMode as string)) {
      throw new Error(`Google OAuth provider '${config.name}' has invalid authMode: ${authMode}`);
    }
  }

  private validateLegacyOAuthConfig(config: ProviderConfig): void {
    // Legacy OAuth providers are deprecated, so just warn
    console.warn(`Legacy OAuth provider '${config.name}' is deprecated and will be removed in a future version`);
  }

  /**
   * Create a provider configuration from environment variables
   */
  createConfigFromEnvironment(providerName: string): ProviderConfig | null {
    const template = PROVIDER_TEMPLATES[providerName];
    if (!template) {
      return null;
    }

    const config: ProviderConfig = {
      enabled: true,
      ...template,
      name: providerName,
      displayName: template.displayName || providerName,
      type: template.type!,
    };

    // Override with environment variables
    this.applyEnvironmentOverrides(config);

    return config;
  }

  private applyEnvironmentOverrides(config: ProviderConfig): void {
    const envPrefix = config.name.toUpperCase().replace('-', '_');

    // Common environment variables
    const baseUrlEnv = process.env[`${envPrefix}_BASE_URL`];
    if (baseUrlEnv) {
      config.baseUrl = baseUrlEnv;
    }

    const modelEnv = process.env[`${envPrefix}_MODEL`];
    if (modelEnv) {
      config.model = modelEnv;
    }

    // Special cases for known providers
    switch (config.name) {
      case 'ollama':
        config.baseUrl = process.env.OLLAMA_BASE_URL || config.baseUrl;
        config.model = process.env.OLLAMA_MODEL || config.model;
        break;
      case 'lm-studio':
        config.baseUrl = process.env.LM_STUDIO_BASE_URL || config.baseUrl;
        config.model = process.env.LM_STUDIO_MODEL || config.model;
        break;
      case 'openai':
        config.baseUrl = process.env.OPENAI_BASE_URL || config.baseUrl;
        config.model = process.env.OPENAI_MODEL || config.model;
        break;
      case 'runpod':
        config.baseUrl = process.env.RUNPOD_BASE_URL || config.baseUrl;
        config.model = process.env.RUNPOD_MODEL || config.model;
        break;
    }
  }
}