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
 * API Key Provider - handles OpenAI, Anthropic, Gemini, Grok, RunPod
 * Consolidates USE_OPENAI, USE_ANTHROPIC, USE_GEMINI, USE_GROK, USE_RUNPOD
 */
export class ApiKeyProvider extends BaseProvider {
  constructor(config: ProviderConfig, providerService: IProviderService) {
    super(config.name, AuthProvider.API_KEY, config.displayName, config, providerService);
  }

  protected async validateProviderSpecific(): Promise<ProviderValidationResult> {
    const results: ProviderValidationResult[] = [];

    // Validate base URL if provided
    if (this.config.baseUrl) {
      results.push(this.validateUrl(this.config.baseUrl, 'Base URL'));
    }

    // Validate model is specified
    results.push(this.validateRequired(this.config.model, 'Model'));

    // Validate provider-specific requirements
    const providerSpecific = await this.validateProviderSpecificRequirements();
    results.push(providerSpecific);

    return this.combineValidationResults(...results);
  }

  private async validateProviderSpecificRequirements(): Promise<ProviderValidationResult> {
    switch (this.name) {
      case 'openai':
        return this.validateOpenAI();
      case 'anthropic':
        return this.validateAnthropic();
      case 'gemini':
        return this.validateGemini();
      case 'grok':
        return this.validateGrok();
      case 'runpod':
        return this.validateRunPod();
      default:
        return { isValid: true };
    }
  }

  private validateOpenAI(): ProviderValidationResult {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    return this.validateUrl(baseUrl, 'OpenAI Base URL');
  }

  private validateAnthropic(): ProviderValidationResult {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com';
    const urlResult = this.validateUrl(baseUrl, 'Anthropic Base URL');
    
    // Validate model format for Anthropic
    const model = this.config.model;
    if (model && !model.startsWith('claude-')) {
      return {
        isValid: false,
        error: 'Anthropic model must start with "claude-"',
      };
    }

    return urlResult;
  }

  private validateGemini(): ProviderValidationResult {
    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    return this.validateUrl(baseUrl, 'Gemini Base URL');
  }

  private validateGrok(): ProviderValidationResult {
    const baseUrl = this.config.baseUrl || 'https://api.x.ai/v1';
    const urlResult = this.validateUrl(baseUrl, 'Grok Base URL');
    
    // Validate model format for Grok
    const model = this.config.model;
    if (model && !model.startsWith('grok-')) {
      return {
        isValid: true,
        warnings: ['Grok models typically start with "grok-"'],
      };
    }

    return urlResult;
  }

  private validateRunPod(): ProviderValidationResult {
    const results: ProviderValidationResult[] = [];

    // RunPod requires a base URL
    results.push(this.validateRequired(this.config.baseUrl, 'RunPod Base URL'));
    
    if (this.config.baseUrl) {
      results.push(this.validateUrl(this.config.baseUrl, 'RunPod Base URL'));
    }

    return this.combineValidationResults(...results);
  }

  protected async validateCredentials(credentials: ProviderCredentials): Promise<ProviderValidationResult> {
    // All API key providers require an API key
    const apiKeyResult = this.validateRequired(credentials.apiKey, 'API Key');
    if (!apiKeyResult.isValid) {
      return apiKeyResult;
    }

    // Validate API key format for specific providers
    return this.validateApiKeyFormat(credentials.apiKey!);
  }

  private validateApiKeyFormat(apiKey: string): ProviderValidationResult {
    switch (this.name) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return {
            isValid: false,
            error: 'OpenAI API key must start with "sk-"',
          };
        }
        break;
      case 'anthropic':
        if (!apiKey.startsWith('sk-ant-')) {
          return {
            isValid: false,
            error: 'Anthropic API key must start with "sk-ant-"',
          };
        }
        break;
      case 'gemini':
        // Gemini API keys are typically 39 characters
        if (apiKey.length < 30) {
          return {
            isValid: true,
            warnings: ['Gemini API key seems shorter than expected'],
          };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Get the appropriate API key environment variable name
   */
  getApiKeyEnvVar(): string {
    switch (this.name) {
      case 'openai':
        return 'OPENAI_API_KEY';
      case 'anthropic':
        return 'ANTHROPIC_API_KEY';
      case 'gemini':
        return 'GEMINI_API_KEY';
      case 'grok':
        return 'GROK_API_KEY';
      case 'runpod':
        return 'RUNPOD_API_KEY';
      default:
        return `${this.name.toUpperCase()}_API_KEY`;
    }
  }

  /**
   * Get the appropriate base URL environment variable name
   */
  getBaseUrlEnvVar(): string {
    switch (this.name) {
      case 'openai':
        return 'OPENAI_BASE_URL';
      case 'runpod':
        return 'RUNPOD_BASE_URL';
      default:
        return `${this.name.toUpperCase()}_BASE_URL`;
    }
  }

  /**
   * Get the appropriate model environment variable name
   */
  getModelEnvVar(): string {
    switch (this.name) {
      case 'openai':
        return 'OPENAI_MODEL';
      case 'runpod':
        return 'RUNPOD_MODEL';
      default:
        return `${this.name.toUpperCase()}_MODEL`;
    }
  }
}