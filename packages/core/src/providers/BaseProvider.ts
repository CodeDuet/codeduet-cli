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
} from './types.js';

/**
 * Abstract base class for all providers
 * Provides common functionality and enforces interface compliance
 */
export abstract class BaseProvider implements IProvider {
  protected providerService: IProviderService;

  constructor(
    public readonly name: string,
    public readonly type: AuthProvider,
    public readonly displayName: string,
    public readonly config: ProviderConfig,
    providerService: IProviderService,
  ) {
    this.providerService = providerService;
    this.validateConfig();
  }

  /**
   * Validate provider configuration on construction
   */
  private validateConfig(): void {
    if (!this.config.name) {
      throw new Error(`Provider configuration must have a name`);
    }
    if (!this.config.type) {
      throw new Error(`Provider configuration must have a type`);
    }
    if (this.config.name !== this.name) {
      throw new Error(`Provider name mismatch: expected ${this.name}, got ${this.config.name}`);
    }
    if (this.config.type !== this.type) {
      throw new Error(`Provider type mismatch: expected ${this.type}, got ${this.config.type}`);
    }
  }

  /**
   * Validate the provider configuration
   * Base implementation checks common requirements
   */
  async validate(): Promise<ProviderValidationResult> {
    try {
      // Perform provider-specific validation
      const result = await this.validateProviderSpecific();
      if (!result.isValid) {
        return result;
      }

      // Test credentials if available
      const credentials = await this.getCredentials();
      if (credentials) {
        const validationResult = await this.validateCredentials(credentials);
        if (!validationResult.isValid) {
          return validationResult;
        }
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  /**
   * Provider-specific validation logic
   * Must be implemented by each provider
   */
  protected abstract validateProviderSpecific(): Promise<ProviderValidationResult>;

  /**
   * Validate provider credentials
   * Default implementation checks basic credential requirements
   */
  protected async validateCredentials(credentials: ProviderCredentials): Promise<ProviderValidationResult> {
    return { isValid: true };
  }

  /**
   * Initialize the provider
   * Base implementation handles common initialization
   */
  async initialize(): Promise<void> {
    const validation = await this.validate();
    if (!validation.isValid) {
      throw new Error(`Provider initialization failed: ${validation.error}`);
    }
    
    await this.initializeProviderSpecific();
  }

  /**
   * Provider-specific initialization logic
   * Can be overridden by providers that need special initialization
   */
  protected async initializeProviderSpecific(): Promise<void> {
    // Default: no additional initialization required
  }

  /**
   * Get credentials for this provider
   */
  async getCredentials(): Promise<ProviderCredentials | null> {
    return this.providerService.getCredentials(this.name);
  }

  /**
   * Set credentials for this provider
   */
  async setCredentials(credentials: ProviderCredentials): Promise<void> {
    await this.providerService.setCredentials(this.name, credentials);
  }

  /**
   * Test connection to the provider
   * Base implementation delegates to provider service
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.providerService.testConnection(this.config);
    } catch (error) {
      console.warn(`Connection test failed for provider ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Cleanup provider resources
   * Can be overridden by providers that need cleanup
   */
  async cleanup(): Promise<void> {
    // Default: no cleanup required
  }

  /**
   * Get a configuration value with type safety
   */
  protected getConfigValue<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.config.additionalConfig?.[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Check if a required configuration value is present
   */
  protected requireConfigValue(key: string): unknown {
    const value = this.config.additionalConfig?.[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Required configuration value '${key}' is missing for provider ${this.name}`);
    }
    return value;
  }

  /**
   * Validate a URL format
   */
  protected validateUrl(url: string, fieldName: string = 'URL'): ProviderValidationResult {
    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: `${fieldName} must be a valid URL format. Got: ${url}`,
      };
    }
  }

  /**
   * Validate that a required field is present
   */
  protected validateRequired(value: unknown, fieldName: string): ProviderValidationResult {
    if (value === undefined || value === null || value === '') {
      return {
        isValid: false,
        error: `${fieldName} is required but not provided`,
      };
    }
    return { isValid: true };
  }

  /**
   * Combine multiple validation results
   */
  protected combineValidationResults(...results: ProviderValidationResult[]): ProviderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const result of results) {
      if (!result.isValid && result.error) {
        errors.push(result.error);
      }
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}