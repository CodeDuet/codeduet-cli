/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IProvider,
  IProviderService,
  AuthProvider,
  ProviderConfig,
  ProviderValidationResult,
  ProviderCredentials,
  LegacyAuthType,
  LEGACY_AUTH_TYPE_MAPPING,
  PROVIDER_TEMPLATES,
} from './types.js';
import { ProviderFactory } from './ProviderFactory.js';
import { ProviderService } from './ProviderService.js';

/**
 * Central provider management system
 * Consolidates 12 AuthTypes into 4 essential patterns
 */
export class ProviderManager {
  private providers: Map<string, IProvider> = new Map();
  private providerService: IProviderService;
  private providerFactory: ProviderFactory;
  private activeProvider: string | null = null;

  constructor() {
    this.providerService = new ProviderService();
    this.providerFactory = new ProviderFactory(this.providerService);
  }

  /**
   * Initialize the provider manager with default providers
   */
  async initialize(): Promise<void> {
    // Initialize default providers from templates
    await this.initializeDefaultProviders();
    
    // Load provider configurations from environment/settings
    await this.loadProviderConfigurations();
    
    // Validate all providers
    await this.validateAllProviders();
  }

  private async initializeDefaultProviders(): Promise<void> {
    const defaultProviders = [
      'openai',
      'anthropic', 
      'gemini',
      'grok',
      'runpod',
      'ollama',
      'lm-studio',
      'google-oauth',
      'qwen-oauth'
    ];

    for (const providerName of defaultProviders) {
      try {
        const config = this.providerFactory.createConfigFromEnvironment(providerName);
        if (config) {
          const provider = this.providerFactory.createProvider(config);
          this.providers.set(providerName, provider);
        }
      } catch (error) {
        console.warn(`Failed to initialize default provider ${providerName}:`, error);
      }
    }
  }

  private async loadProviderConfigurations(): Promise<void> {
    // This would load from user settings/configuration files
    // For now, we'll use environment-based configuration
    console.debug('Provider configurations loaded from environment variables');
  }

  private async validateAllProviders(): Promise<void> {
    const validationPromises = Array.from(this.providers.entries()).map(
      async ([name, provider]) => {
        try {
          const result = await provider.validate();
          if (!result.isValid) {
            console.warn(`Provider ${name} validation failed: ${result.error}`);
          } else if (result.warnings) {
            console.warn(`Provider ${name} warnings:`, result.warnings);
          }
          return { name, result };
        } catch (error) {
          console.error(`Provider ${name} validation error:`, error);
          return { name, result: { isValid: false, error: String(error) } };
        }
      }
    );

    await Promise.all(validationPromises);
  }

  /**
   * Register a new provider
   */
  async registerProvider(config: ProviderConfig): Promise<void> {
    const provider = this.providerFactory.createProvider(config);
    await provider.initialize();
    this.providers.set(config.name, provider);
  }

  /**
   * Get a provider by name
   */
  getProvider(name: string): IProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): Map<string, IProvider> {
    return new Map(this.providers);
  }

  /**
   * Get providers by type
   */
  getProvidersByType(type: AuthProvider): IProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.type === type);
  }

  /**
   * Get available providers (enabled and valid)
   */
  async getAvailableProviders(): Promise<IProvider[]> {
    const available: IProvider[] = [];
    
    for (const provider of this.providers.values()) {
      if (provider.config.enabled) {
        const validation = await provider.validate();
        if (validation.isValid) {
          available.push(provider);
        }
      }
    }

    return available;
  }

  /**
   * Set the active provider
   */
  async setActiveProvider(name: string): Promise<void> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }

    const validation = await provider.validate();
    if (!validation.isValid) {
      throw new Error(`Cannot activate invalid provider '${name}': ${validation.error}`);
    }

    this.activeProvider = name;
  }

  /**
   * Get the active provider
   */
  getActiveProvider(): IProvider | null {
    if (!this.activeProvider) {
      return null;
    }
    return this.providers.get(this.activeProvider) || null;
  }

  /**
   * Test connection for a provider
   */
  async testProviderConnection(name: string): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) {
      return false;
    }

    return await provider.testConnection();
  }

  /**
   * Get provider credentials
   */
  async getProviderCredentials(name: string): Promise<ProviderCredentials | null> {
    const provider = this.providers.get(name);
    if (!provider) {
      return null;
    }

    return await provider.getCredentials();
  }

  /**
   * Set provider credentials
   */
  async setProviderCredentials(name: string, credentials: ProviderCredentials): Promise<void> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }

    await provider.setCredentials(credentials);
  }

  /**
   * Remove a provider
   */
  async removeProvider(name: string): Promise<void> {
    const provider = this.providers.get(name);
    if (provider) {
      await provider.cleanup();
      this.providers.delete(name);
      
      if (this.activeProvider === name) {
        this.activeProvider = null;
      }
    }
  }

  /**
   * Validate a provider configuration
   */
  async validateProviderConfig(config: ProviderConfig): Promise<ProviderValidationResult> {
    return await this.providerService.validateConfiguration(config);
  }

  /**
   * Create a provider from template
   */
  createProviderFromTemplate(templateName: string, overrides: Partial<ProviderConfig> = {}): IProvider {
    return this.providerFactory.createFromTemplate(templateName, overrides);
  }

  /**
   * Get available provider templates
   */
  getAvailableTemplates(): string[] {
    return this.providerFactory.getAvailableTemplates();
  }

  /**
   * Backward compatibility: Convert legacy AuthType to provider name
   */
  mapLegacyAuthTypeToProvider(authType: LegacyAuthType): string | null {
    const providerType = LEGACY_AUTH_TYPE_MAPPING[authType];
    if (!providerType) {
      return null;
    }

    // Find a provider of the appropriate type
    for (const [name, provider] of this.providers) {
      if (provider.type === providerType) {
        return name;
      }
    }

    return null;
  }

  /**
   * Backward compatibility: Validate legacy auth method
   */
  async validateLegacyAuthMethod(authType: LegacyAuthType): Promise<ProviderValidationResult> {
    const providerName = this.mapLegacyAuthTypeToProvider(authType);
    if (!providerName) {
      return {
        isValid: false,
        error: `Legacy auth type '${authType}' is not supported`,
      };
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      return {
        isValid: false,
        error: `Provider for auth type '${authType}' is not available`,
      };
    }

    return await provider.validate();
  }

  /**
   * Auto-detect and configure providers from environment
   */
  async autoDetectProviders(): Promise<string[]> {
    const detectedProviders: string[] = [];

    // Check for API key environment variables
    const apiKeyProviders = [
      { name: 'openai', envVar: 'OPENAI_API_KEY' },
      { name: 'anthropic', envVar: 'ANTHROPIC_API_KEY' },
      { name: 'gemini', envVar: 'GEMINI_API_KEY' },
      { name: 'grok', envVar: 'GROK_API_KEY' },
      { name: 'runpod', envVar: 'RUNPOD_API_KEY' },
    ];

    for (const { name, envVar } of apiKeyProviders) {
      if (process.env[envVar]) {
        try {
          const config = this.providerFactory.createConfigFromEnvironment(name);
          if (config) {
            await this.registerProvider(config);
            detectedProviders.push(name);
          }
        } catch (error) {
          console.warn(`Failed to auto-detect provider ${name}:`, error);
        }
      }
    }

    // Check for local HTTP providers
    const localProviders = [
      { name: 'ollama', envVar: 'OLLAMA_BASE_URL', defaultUrl: 'http://localhost:11434' },
      { name: 'lm-studio', envVar: 'LM_STUDIO_BASE_URL', defaultUrl: 'http://localhost:1234' },
    ];

    for (const { name, envVar, defaultUrl } of localProviders) {
      const baseUrl = process.env[envVar] || defaultUrl;
      
      try {
        // Test if the service is running
        const response = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
        if (response.ok) {
          const config = this.providerFactory.createConfigFromEnvironment(name);
          if (config) {
            await this.registerProvider(config);
            detectedProviders.push(name);
          }
        }
      } catch {
        // Service not running, skip
      }
    }

    return detectedProviders;
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): {
    total: number;
    byType: Record<AuthProvider, number>;
    enabled: number;
    active: string | null;
  } {
    const stats = {
      total: this.providers.size,
      byType: {
        [AuthProvider.API_KEY]: 0,
        [AuthProvider.LOCAL_HTTP]: 0,
        [AuthProvider.GOOGLE_OAUTH]: 0,
        [AuthProvider.LEGACY_OAUTH]: 0,
      },
      enabled: 0,
      active: this.activeProvider,
    };

    for (const provider of this.providers.values()) {
      stats.byType[provider.type]++;
      if (provider.config.enabled) {
        stats.enabled++;
      }
    }

    return stats;
  }

  /**
   * Cleanup all providers
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.providers.values()).map(provider => 
      provider.cleanup().catch(error => 
        console.warn(`Cleanup failed for provider ${provider.name}:`, error)
      )
    );

    await Promise.all(cleanupPromises);
    this.providers.clear();
    this.activeProvider = null;
  }
}