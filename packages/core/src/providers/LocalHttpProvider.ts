/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseProvider } from './BaseProvider.js';
import {
  AuthProvider,
  ProviderConfig,
  ProviderValidationResult,
  ProviderCredentials,
  IProviderService,
} from './types.js';

/**
 * Local HTTP Provider - handles Ollama, LM Studio
 * Consolidates USE_OLLAMA, USE_LM_STUDIO
 */
export class LocalHttpProvider extends BaseProvider {
  constructor(config: ProviderConfig, providerService: IProviderService) {
    super(config.name, AuthProvider.LOCAL_HTTP, config.displayName, config, providerService);
  }

  protected async validateProviderSpecific(): Promise<ProviderValidationResult> {
    const results: ProviderValidationResult[] = [];

    // Validate base URL is provided and valid
    results.push(this.validateRequired(this.config.baseUrl, 'Base URL'));
    
    if (this.config.baseUrl) {
      results.push(this.validateUrl(this.config.baseUrl, 'Base URL'));
      results.push(await this.validateLocalUrl(this.config.baseUrl));
    }

    // Validate model is specified
    results.push(this.validateRequired(this.config.model, 'Model'));

    return this.combineValidationResults(...results);
  }

  private async validateLocalUrl(baseUrl: string): Promise<ProviderValidationResult> {
    try {
      const url = new URL(baseUrl);
      
      // Check if it's a local URL
      const isLocal = url.hostname === 'localhost' || 
                     url.hostname === '127.0.0.1' || 
                     url.hostname.startsWith('192.168.') ||
                     url.hostname.startsWith('10.') ||
                     url.hostname.startsWith('172.');

      if (!isLocal) {
        return {
          isValid: true,
          warnings: [`URL ${baseUrl} doesn't appear to be local. Local HTTP providers are typically used with localhost or local network addresses.`],
        };
      }

      // Validate default ports for known providers
      return this.validateDefaultPort(url);
    } catch {
      return {
        isValid: false,
        error: `Invalid URL format: ${baseUrl}`,
      };
    }
  }

  private validateDefaultPort(url: URL): ProviderValidationResult {
    const warnings: string[] = [];

    switch (this.name) {
      case 'ollama':
        if (url.port && url.port !== '11434') {
          warnings.push(`Ollama typically uses port 11434, but ${url.port} was specified`);
        }
        break;
      case 'lm-studio':
        if (url.port && url.port !== '1234') {
          warnings.push(`LM Studio typically uses port 1234, but ${url.port} was specified`);
        }
        break;
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  protected async validateCredentials(credentials: ProviderCredentials): Promise<ProviderValidationResult> {
    // Local HTTP providers typically don't require API keys
    // But we allow them for custom configurations
    return { isValid: true };
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to ping the service health endpoint
      const healthUrl = await this.getHealthCheckUrl();
      if (healthUrl) {
        const response = await fetch(healthUrl, {
          method: 'GET',
          timeout: 5000,
        });
        return response.ok;
      }
      
      // Fallback to base connection test
      return await super.testConnection();
    } catch (error) {
      console.warn(`Health check failed for ${this.name}:`, error);
      return false;
    }
  }

  private async getHealthCheckUrl(): Promise<string | null> {
    if (!this.config.baseUrl) {
      return null;
    }

    const baseUrl = this.config.baseUrl.replace(/\/$/, '');

    switch (this.name) {
      case 'ollama':
        return `${baseUrl}/api/tags`;
      case 'lm-studio':
        return `${baseUrl}/v1/models`;
      default:
        return `${baseUrl}/health`;
    }
  }

  /**
   * Get available models from the local service
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const modelsUrl = await this.getModelsUrl();
      if (!modelsUrl) {
        return [];
      }

      const response = await fetch(modelsUrl, {
        method: 'GET',
        timeout: 10000,
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return this.parseModelsResponse(data);
    } catch (error) {
      console.warn(`Failed to fetch models for ${this.name}:`, error);
      return [];
    }
  }

  private async getModelsUrl(): Promise<string | null> {
    if (!this.config.baseUrl) {
      return null;
    }

    const baseUrl = this.config.baseUrl.replace(/\/$/, '');

    switch (this.name) {
      case 'ollama':
        return `${baseUrl}/api/tags`;
      case 'lm-studio':
        return `${baseUrl}/v1/models`;
      default:
        return `${baseUrl}/models`;
    }
  }

  private parseModelsResponse(data: any): string[] {
    try {
      switch (this.name) {
        case 'ollama':
          return data.models?.map((model: any) => model.name) || [];
        case 'lm-studio':
          return data.data?.map((model: any) => model.id) || [];
        default:
          return Array.isArray(data) ? data.map(String) : [];
      }
    } catch {
      return [];
    }
  }

  /**
   * Get the appropriate base URL environment variable name
   */
  getBaseUrlEnvVar(): string {
    switch (this.name) {
      case 'ollama':
        return 'OLLAMA_BASE_URL';
      case 'lm-studio':
        return 'LM_STUDIO_BASE_URL';
      default:
        return `${this.name.toUpperCase()}_BASE_URL`;
    }
  }

  /**
   * Get the appropriate model environment variable name
   */
  getModelEnvVar(): string {
    switch (this.name) {
      case 'ollama':
        return 'OLLAMA_MODEL';
      case 'lm-studio':
        return 'LM_STUDIO_MODEL';
      default:
        return `${this.name.toUpperCase()}_MODEL`;
    }
  }

  /**
   * Get default configuration for this provider
   */
  static getDefaultConfig(name: string): Partial<ProviderConfig> {
    switch (name) {
      case 'ollama':
        return {
          baseUrl: 'http://localhost:11434',
          model: 'llama2',
        };
      case 'lm-studio':
        return {
          baseUrl: 'http://localhost:1234',
          model: 'local-model',
        };
      default:
        return {};
    }
  }
}